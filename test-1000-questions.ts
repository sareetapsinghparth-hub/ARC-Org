/**
 * 1000-Question End-to-End Training Validation for ARC
 * Exercises curriculum synthesis, adaptive selection, and answer evaluation via live API.
 */

import { BASE_TEST_QUESTIONS, expandToQuestionCount } from './test/fixtures/baseQuestions';
import { buildClientCurriculum } from './src/utils/curriculumBuilder';
import { selectNextAdaptiveQuestion } from './src/utils/adaptiveEngine';
import { LessonData, Question, AnswerAnalysisResult } from './src/types';

const TARGET_COUNT = 1000;
const API_BASE = process.env.ARC_API_BASE || 'http://127.0.0.1:3000';
const BATCH_SIZE = 25;

const TEST_QUESTIONS = expandToQuestionCount(BASE_TEST_QUESTIONS, TARGET_COUNT);

type Stats = {
  curriculum: number;
  fidelity: number;
  adaptive: number;
  localEval: number;
  apiLesson: number;
  apiAnswer: number;
  solutionAccepted: number;
  apiSolutionAccepted: number;
  errors: string[];
};

async function fetchJson<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function validateCurriculum(lesson: LessonData, questionText: string): boolean {
  const hasStructure =
    Boolean(lesson.topic) &&
    Array.isArray(lesson.concepts) &&
    lesson.concepts.length >= 3 &&
    Array.isArray(lesson.prerequisites) &&
    lesson.prerequisites.length >= 2 &&
    Array.isArray(lesson.questions) &&
    lesson.questions.length >= 3;

  const firstQ = lesson.questions[0];
  const fidelity =
    Boolean(firstQ?.prompt) &&
    (firstQ.prompt === questionText ||
      firstQ.prompt.toLowerCase().includes(questionText.slice(0, 28).toLowerCase()));

  return hasStructure && fidelity;
}

function validateEvaluation(result: AnswerAnalysisResult): boolean {
  return (
    typeof result.score === 'number' &&
    result.score >= 0 &&
    result.score <= 1 &&
    ['correct', 'partly correct', 'incorrect'].includes(result.status) &&
    Boolean(result.feedback) &&
    Boolean(result.recommendedAction)
  );
}

function isSolutionAccepted(result: AnswerAnalysisResult): boolean {
  return result.status === 'correct' || (result.status === 'partly correct' && result.score >= 0.6);
}

async function processQuestion(index: number, questionText: string, stats: Stats): Promise<void> {
  const qNum = index + 1;

  try {
    const lesson = buildClientCurriculum(questionText, true);
    if (validateCurriculum(lesson, questionText)) {
      stats.curriculum++;
      stats.fidelity++;
    } else {
      stats.errors.push(`Q${qNum}: invalid local curriculum`);
    }

    const firstQ = lesson.questions[0];
    const selection = selectNextAdaptiveQuestion(lesson.concepts, lesson.prerequisites, lesson.questions, {}, []);
    if (selection.question?.id === firstQ.id) stats.adaptive++;

    const sampleAnswer =
      firstQ.sampleSolution ||
      `Step-by-step solution for ${lesson.topic}: apply foundational principles, show intermediate transformations, and state the final conclusion with correct notation.`;

    // Local rubric-style evaluation path (mirrors offline stress tests)
    const localEval = evaluateLocally(firstQ, sampleAnswer);
    if (validateEvaluation(localEval)) stats.localEval++;
    if (isSolutionAccepted(localEval)) stats.solutionAccepted++;

    const lessonRes = await fetchJson<LessonData>('/api/analyze-lesson', { topic: questionText, isWebSearch: true });
    if (lessonRes.ok && lessonRes.data && validateCurriculum(lessonRes.data, questionText)) {
      stats.apiLesson++;
    } else {
      stats.errors.push(`Q${qNum}: analyze-lesson failed (${lessonRes.status})`);
    }

    const apiQ = lessonRes.data?.questions?.[0] || firstQ;
    const answerRes = await fetchJson<AnswerAnalysisResult>('/api/analyze-answer', {
      question: apiQ,
      concept: lesson.concepts.find((c) => c.id === apiQ.conceptId),
      studentAnswer: sampleAnswer,
      currentConfidence: 0.5,
    });

    if (answerRes.ok && answerRes.data && validateEvaluation(answerRes.data)) {
      stats.apiAnswer++;
      if (isSolutionAccepted(answerRes.data)) stats.apiSolutionAccepted++;
    } else {
      stats.errors.push(`Q${qNum}: analyze-answer failed (${answerRes.status})`);
    }
  } catch (err: any) {
    stats.errors.push(`Q${qNum}: ${err?.message || String(err)}`);
  }
}

function evaluateLocally(question: Question, answer: string): AnswerAnalysisResult {
  const norm = answer.toLowerCase().trim();
  const rubric = question.rubricKeyPoints || [];
  const sample = (question.sampleSolution || '').toLowerCase();

  let matched = 0;
  for (const point of rubric) {
    const words = point.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => norm.includes(w))) matched++;
  }

  const sampleTokens = sample.split(/\W+/).filter((w) => w.length > 4);
  const answerTokens = new Set(norm.split(/\W+/).filter((w) => w.length > 4));
  const sampleOverlap =
    sampleTokens.length > 0
      ? sampleTokens.filter((t) => answerTokens.has(t)).length / sampleTokens.length
      : 0;

  if (norm.length < 8) {
    return {
      status: 'incorrect',
      score: 0.15,
      misconception: 'Insufficient explanation.',
      feedback: 'Too brief.',
      recommendedAction: 'Expand your answer.',
      confidenceDelta: -0.15,
      newConfidence: 0.35,
    };
  }

  const ratio = rubric.length > 0 ? matched / rubric.length : 0.5;
  if (sampleOverlap >= 0.45 || ratio >= 0.5 || norm.length > 60) {
    return {
      status: 'correct',
      score: 0.95,
      misconception: 'None',
      feedback: `Strong reasoning for ${question.conceptName}.`,
      recommendedAction: 'Proceed to the next adaptive target.',
      confidenceDelta: 0.28,
      newConfidence: 0.78,
    };
  }
  if (ratio >= 0.2 || norm.length > 30) {
    return {
      status: 'partly correct',
      score: 0.65,
      misconception: 'Minor gap.',
      feedback: 'Good direction with small gaps.',
      recommendedAction: 'Review the sample solution.',
      confidenceDelta: 0.08,
      newConfidence: 0.58,
    };
  }
  return {
    status: 'incorrect',
    score: 0.2,
    misconception: 'Conceptual gap.',
    feedback: 'Prerequisites not applied.',
    recommendedAction: 'Retry with step-by-step work.',
    confidenceDelta: -0.15,
    newConfidence: 0.35,
  };
}

async function runInBatches<T>(items: T[], worker: (item: T, idx: number) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    await Promise.all(slice.map((item, offset) => worker(item, i + offset)));
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= items.length) {
      console.log(`… processed ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
    }
  }
}

async function main() {
  console.log('===============================================================');
  console.log(' ARC 1000-QUESTION TRAINING / VALIDATION SUITE');
  console.log(` API: ${API_BASE} | Questions: ${TARGET_COUNT}`);
  console.log('===============================================================\n');

  const health = await fetch(`${API_BASE}/api/health`);
  if (!health.ok) {
    console.error('Dev server not reachable. Start with: npm run dev');
    process.exit(1);
  }

  const stats: Stats = {
    curriculum: 0,
    fidelity: 0,
    adaptive: 0,
    localEval: 0,
    apiLesson: 0,
    apiAnswer: 0,
    solutionAccepted: 0,
    apiSolutionAccepted: 0,
    errors: [],
  };

  const start = Date.now();
  await runInBatches(TEST_QUESTIONS, async (q, idx) => processQuestion(idx, q, stats));
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n===============================================================');
  console.log(' FINAL RESULTS');
  console.log('===============================================================');
  console.log(`Curriculum (local):        ${stats.curriculum}/${TARGET_COUNT}`);
  console.log(`Question fidelity:         ${stats.fidelity}/${TARGET_COUNT}`);
  console.log(`Adaptive selection:        ${stats.adaptive}/${TARGET_COUNT}`);
  console.log(`Local evaluation:          ${stats.localEval}/${TARGET_COUNT}`);
  console.log(`API analyze-lesson:        ${stats.apiLesson}/${TARGET_COUNT}`);
  console.log(`API analyze-answer:        ${stats.apiAnswer}/${TARGET_COUNT}`);
  console.log(`Reference solutions (local): ${stats.solutionAccepted}/${TARGET_COUNT}`);
  console.log(`Reference solutions (API):   ${stats.apiSolutionAccepted}/${TARGET_COUNT}`);
  console.log(`Elapsed:                   ${elapsed}s`);
  console.log(`Errors logged:             ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\nFirst 10 errors:');
    stats.errors.slice(0, 10).forEach((e) => console.log(' -', e));
  }

  const pass =
    stats.curriculum === TARGET_COUNT &&
    stats.apiLesson === TARGET_COUNT &&
    stats.apiAnswer === TARGET_COUNT &&
    stats.apiSolutionAccepted >= TARGET_COUNT * 0.95;

  console.log(pass ? '\n✅ ALL 1000 QUESTIONS PASSED' : '\n⚠️  FAILURES DETECTED — see errors above');
  process.exit(pass ? 0 : 1);
}

main();
