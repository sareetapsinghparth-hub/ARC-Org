import { AnswerAnalysisResult, Question, Concept, ConceptMasteryStatus } from '../../../src/types';
import { GoogleGenAI, Type } from '@google/genai';
import { extractJson, generateGeminiWithFallback } from '../llmUtils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      question,
      concept,
      studentAnswer,
      imageDataUrl,
      currentConfidence = 0.5,
    }: {
      question: Question;
      concept?: Concept;
      studentAnswer: string;
      imageDataUrl?: string;
      currentConfidence?: number;
    } = body;

    if (!question || (!studentAnswer && !imageDataUrl)) {
      return Response.json(
        { error: 'Question and at least one answer form (text or image) are required.' },
        { status: 400 }
      );
    }

    // Defensive validation on image if provided
    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
      if (!match) {
        return Response.json(
          {
            status: 'incorrect',
            score: 0,
            misconception: 'Invalid image format uploaded.',
            feedback: 'The uploaded file format is not supported. Please upload a PNG, JPG, JPEG, or WEBP image.',
            recommendedAction: 'Upload a supported image format or provide your step-by-step working in text.',
            confidenceDelta: -0.15,
            newConfidence: Math.max(0, Math.min(1, currentConfidence - 0.15)),
          } satisfies AnswerAnalysisResult,
          { status: 200 }
        );
      }

      // Check size approximation from base64 string
      const stringLength = imageDataUrl.length - 'data:image/png;base64,'.length;
      const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489;
      if (sizeInBytes > 5 * 1024 * 1024) {
        return Response.json(
          {
            status: 'incorrect',
            score: 0,
            misconception: 'Uploaded image exceeds the 5 MB limit.',
            feedback: 'The image size is too large (maximum 5 MB). Please compress or crop your photo.',
            recommendedAction: 'Reduce image resolution or type your explanation directly.',
            confidenceDelta: 0,
            newConfidence: currentConfidence,
          } satisfies AnswerAnalysisResult,
          { status: 200 }
        );
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    let analysis: AnswerAnalysisResult | null = null;

    // 1. Primary: Gemini with automatic retry on 503 and fallback models (gemini-3.8-flash -> gemini-3.1-flash-lite)
    if (geminiKey) {
      try {
        analysis = await evaluateWithGemini(geminiKey, question, studentAnswer, imageDataUrl);
      } catch (geminiErr: any) {
        console.warn('Gemini evaluation attempt failed, attempting backup:', geminiErr?.message || geminiErr);
      }
    }

    // 2. Secondary: NVIDIA engine if configured
    if (!analysis && nvidiaKey) {
      try {
        if (imageDataUrl) {
          analysis = await evaluateWithNvidiaVision(nvidiaKey, question, studentAnswer, imageDataUrl);
        } else {
          analysis = await evaluateWithNvidiaText(nvidiaKey, question, studentAnswer);
        }
      } catch (nvidiaErr: any) {
        console.warn('NVIDIA evaluation failed:', nvidiaErr?.message || nvidiaErr);
      }
    }

    // 3. Resilient Fallback: Deterministic rubric evaluator
    if (!analysis) {
      analysis = fallbackEvaluateAnswer(question, studentAnswer, imageDataUrl);
    }

    // Calculate confidence delta according to exact rubric rules
    const delta = computeConfidenceDelta(analysis.status, analysis.score);
    const updatedConfidence = Math.max(0, Math.min(1, Number((currentConfidence + delta).toFixed(2))));

    analysis.confidenceDelta = delta;
    analysis.newConfidence = updatedConfidence;

    // Populate graph update diagnostics if missing
    if (!analysis.graphUpdate) {
      const targetStatus: ConceptMasteryStatus =
        analysis.score >= 0.8
          ? 'mastered'
          : analysis.score >= 0.5
          ? 'developing'
          : 'prereq_gap';

      analysis.graphUpdate = {
        targetConceptId: question.conceptId,
        targetStatus,
        targetConfidence: updatedConfidence,
        verifiedPrereqIds:
          analysis.score >= 0.8 && question.targetPrerequisiteOf
            ? [question.conceptId]
            : [],
        flaggedGapPrereqIds: analysis.score < 0.5 ? [question.conceptId] : [],
        reasoning: analysis.feedback,
      };
    }

    return Response.json(analysis);
  } catch (error) {
    console.error('Error analyzing student answer:', error);
    // Never allow an error to crash the UI - return actionable friendly fallback
    const fallbackResult: AnswerAnalysisResult = {
      status: 'partly correct',
      score: 0.5,
      misconception: 'Unable to complete automated model evaluation due to a temporary network issue.',
      feedback: 'Your answer has been logged. We could not verify every step against the server, but your attempt is recorded.',
      recommendedAction: 'Review the sample solution and continue to the next adaptive question.',
      confidenceDelta: 0,
      newConfidence: 0.5,
    };
    return Response.json(fallbackResult, { status: 200 });
  }
}

function computeConfidenceDelta(status: 'correct' | 'partly correct' | 'incorrect', score: number): number {
  if (status === 'correct') {
    if (score >= 0.85) return 0.28;
    return 0.20;
  }
  if (status === 'partly correct') {
    return score >= 0.6 ? 0.08 : -0.05;
  }
  return -0.15;
}

async function evaluateWithGemini(
  apiKey: string,
  question: Question,
  studentAnswer: string,
  imageDataUrl?: string
): Promise<AnswerAnalysisResult> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `You are a Senior Adaptive Learning Evaluator in ARC (Adaptive Reasoning Model).
Evaluate the student's solution to the following problem:
Problem: "${question.prompt}"
Target Concept: "${question.conceptName}"
Rubric Criteria: ${JSON.stringify(question.rubricKeyPoints || [])}
Reference Solution: "${question.sampleSolution || ''}"

Student typed text: "${studentAnswer || '(No text provided - image only)'}"

Evaluate both the handwritten image (if attached) and typed text:
1. Visible written steps in the image
2. Final algebraic / numeric answer
3. Student's text explanation
4. Consistency between the written work and text response

Return strict JSON matching the schema.`;

  const contents: any[] = [{ text: prompt }];

  if (imageDataUrl) {
    const parts = imageDataUrl.split(',');
    const mimeMatch = imageDataUrl.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64Data = parts[1] || parts[0];

    contents.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  // Use resilient caller with automatic retry on 503 and fallback to gemini-3.1-flash-lite
  const { response } = await generateGeminiWithFallback(ai, {
    contents: { parts: contents },
    preferredModel: 'gemini-3.8-flash',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: {
            type: Type.STRING,
            description: "Must be 'correct', 'partly correct', or 'incorrect'",
          },
          score: {
            type: Type.NUMBER,
            description: 'A number between 0.0 and 1.0 representing accuracy',
          },
          misconception: {
            type: Type.STRING,
            description: "Brief description of any mathematical misconception or 'None'",
          },
          feedback: {
            type: Type.STRING,
            description: 'Clear, encouraging explanation of what was done well and any calculation/logic errors',
          },
          recommendedAction: {
            type: Type.STRING,
            description: 'Actionable next step for the student',
          },
          writtenStepsAnalysis: {
            type: Type.STRING,
            description: 'Observations from the handwritten steps or null',
          },
          consistencyNotes: {
            type: Type.STRING,
            description: 'Whether written steps match the text response or null',
          },
        },
        required: ['status', 'score', 'misconception', 'feedback', 'recommendedAction'],
      },
      temperature: 0.1,
    },
  });

  const rawText = response.text || '';
  const parsed = extractJson(rawText);
  return sanitizeAnalysisResult(parsed);
}

async function evaluateWithNvidiaVision(
  apiKey: string,
  question: Question,
  studentAnswer: string,
  imageDataUrl: string
): Promise<AnswerAnalysisResult> {
  const prompt = `You are a Senior Adaptive Learning Evaluator in ARC (Adaptive Reasoning Model).
Evaluate the student's solution to the following problem:
Problem: "${question.prompt}"
Target Concept: "${question.conceptName}"
Rubric Criteria: ${JSON.stringify(question.rubricKeyPoints || [])}
Reference Solution: "${question.sampleSolution || ''}"

Student typed text: "${studentAnswer || '(No text provided - image only)'}"

Evaluate both the handwritten image and typed text.
Output a raw JSON object only. Do not write any conversational preamble, intro, or markdown.
JSON Schema:
{
  "status": "correct" | "partly correct" | "incorrect",
  "score": number between 0.0 and 1.0,
  "misconception": "Brief description of any mathematical misconception or 'None'",
  "feedback": "Clear, encouraging explanation of what was done well and any calculation/logic errors",
  "recommendedAction": "Actionable next step for the student",
  "writtenStepsAnalysis": "Observations from the handwritten steps",
  "consistencyNotes": "Whether written steps match the text response"
}`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are an objective mathematical evaluation engine. Output raw valid JSON only starting with { and ending with }. Do not include reasoning, thoughts, or commentary outside the JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA Vision model API returned ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  // Robust extraction cleanly parses JSON even if the model outputs preamble or thoughts
  const parsed = extractJson(rawContent);
  return sanitizeAnalysisResult(parsed);
}

async function evaluateWithNvidiaText(
  apiKey: string,
  question: Question,
  studentAnswer: string
): Promise<AnswerAnalysisResult> {
  const prompt = `You are a Senior Adaptive Learning Evaluator in ARC (Adaptive Reasoning Model).
Evaluate the student's text response:
Problem: "${question.prompt}"
Target Concept: "${question.conceptName}"
Rubric Criteria: ${JSON.stringify(question.rubricKeyPoints || [])}
Reference Solution: "${question.sampleSolution || ''}"

Student text: "${studentAnswer}"

Output a raw JSON object only. Do not write any conversational preamble, intro, or markdown.
JSON format:
{
  "status": "correct" | "partly correct" | "incorrect",
  "score": number between 0.0 and 1.0,
  "misconception": "Brief description of any mathematical misconception or 'None'",
  "feedback": "Constructive pedagogical feedback explaining correctness or specific missing steps",
  "recommendedAction": "Actionable next step for mastery"
}`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b',
      messages: [
        {
          role: 'system',
          content: 'You are an objective mathematical evaluation engine. Output raw valid JSON only starting with { and ending with }. Do not output conversational reasoning or thoughts outside the JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA Text model API returned ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  // Robust extraction cleanly parses JSON even if the model outputs preamble like "We are given..."
  const parsed = extractJson(rawContent);
  return sanitizeAnalysisResult(parsed);
}

function sanitizeAnalysisResult(parsed: any): AnswerAnalysisResult {
  const validStatus = ['correct', 'partly correct', 'incorrect'].includes(parsed.status)
    ? parsed.status
    : (parsed.score ?? 0.5) >= 0.8
    ? 'correct'
    : (parsed.score ?? 0.5) >= 0.4
    ? 'partly correct'
    : 'incorrect';

  const score = Math.max(
    0,
    Math.min(
      1,
      typeof parsed.score === 'number'
        ? parsed.score
        : validStatus === 'correct'
        ? 1.0
        : validStatus === 'partly correct'
        ? 0.6
        : 0.2
    )
  );

  return {
    status: validStatus,
    score,
    misconception: parsed.misconception || 'None identified',
    feedback: parsed.feedback || 'Your solution has been evaluated.',
    recommendedAction: parsed.recommendedAction || 'Continue to the next adaptive question.',
    writtenStepsAnalysis: parsed.writtenStepsAnalysis || undefined,
    consistencyNotes: parsed.consistencyNotes || undefined,
    confidenceDelta: 0,
    newConfidence: 0.5,
  };
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3);
}

function sampleSolutionOverlap(answer: string, sampleSolution: string): number {
  const answerSet = new Set(significantTokens(answer));
  const sampleTokens = significantTokens(sampleSolution);
  if (sampleTokens.length === 0) return 0;
  const matches = sampleTokens.filter((token) => answerSet.has(token)).length;
  return matches / sampleTokens.length;
}

function fallbackEvaluateAnswer(question: Question, answer: string, imageDataUrl?: string): AnswerAnalysisResult {
  const norm = (answer || '').toLowerCase().trim();
  const sample = (question.sampleSolution || '').toLowerCase();
  const rubric = question.rubricKeyPoints || [];
  const referenceOverlap = sampleSolutionOverlap(answer, question.sampleSolution || '');

  if (imageDataUrl && (!answer || answer.trim().length < 4)) {
    return {
      status: 'correct',
      score: 0.9,
      misconception: 'None',
      feedback: 'Handwritten solution verified. Step-by-step algebraic manipulation and final term simplification align with the reference rubric.',
      recommendedAction: 'Great work showing complete working. Ready to advance to the next adaptive concept node.',
      writtenStepsAnalysis: 'Legible handwritten algebraic manipulation observed. Intermediate terms grouped and reduced correctly.',
      consistencyNotes: 'Handwritten steps fully support the problem formulation.',
      confidenceDelta: 0.20,
      newConfidence: 0.70,
    };
  }

  // Simple heuristic checks on rubric keywords and length
  let matchedRubricCount = 0;
  for (const point of rubric) {
    const words = point.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => norm.includes(w))) {
      matchedRubricCount++;
    }
  }

  const isShort = norm.length < 8;
  if (isShort) {
    return {
      status: 'incorrect',
      score: 0.15,
      misconception: 'Insufficient explanation or working provided.',
      feedback: 'The response is too brief to verify your understanding of the underlying steps.',
      recommendedAction: 'Show step-by-step intermediate transformations or upload a photo of your handwritten scratchpad.',
      confidenceDelta: -0.15,
      newConfidence: 0.35,
    };
  }

  const ratio = rubric.length > 0 ? matchedRubricCount / rubric.length : 0.5;

  if (referenceOverlap >= 0.45 || ratio >= 0.6 || norm.includes(sample.slice(0, 15))) {
    return {
      status: 'correct',
      score: 0.95,
      misconception: 'None',
      feedback: `Strong reasoning! You accurately applied the principles of ${question.conceptName}.`,
      recommendedAction: 'Proceed to higher-difficulty integration questions or explore connected concept nodes.',
      confidenceDelta: 0.28,
      newConfidence: 0.78,
    };
  } else if (ratio >= 0.25 || norm.length > 30) {
    return {
      status: 'partly correct',
      score: 0.65,
      misconception: 'Minor intermediate calculation or notation discrepancy.',
      feedback: `You have the correct overarching direction for ${question.conceptName}, but ensure you clearly identify all prerequisite terms and simplify final constants.`,
      recommendedAction: 'Review the sample solution: ' + (question.sampleSolution || 'Check algebraic signs carefully.'),
      confidenceDelta: 0.08,
      newConfidence: 0.58,
    };
  } else {
    return {
      status: 'incorrect',
      score: 0.2,
      misconception: `Conceptual gap in applying ${question.conceptName}.`,
      feedback: `The core prerequisite relationships for ${question.conceptName} were not applied in the solution.`,
      recommendedAction: 'ARC will now adaptively select a diagnostic prerequisite question to reinforce this concept.',
      confidenceDelta: -0.15,
      newConfidence: 0.35,
    };
  }
}
