import { Concept, PrerequisiteEdge, Question, AdaptiveSelectionMeta } from '../types';
import { getConceptStatus } from './kGraphJudgment';

/**
 * Deterministic Adaptive Selection Engine for ARC (Adaptive Reasoning Model)
 * 
 * Priority Rules:
 * 1. Prerequisite Gaps: Intervene on weak prerequisites identified from incorrect answers.
 * 2. Unassessed Foundational Concepts: Test root concepts first to establish baseline in K-Graph.
 * 3. Unassessed Successors: Concepts whose prerequisites are already verified or mastered.
 * 4. Developing Concepts (0.50–0.75): Practice and reinforce.
 * 5. Mastered Concepts (>= 0.75): Lowest priority, repeat only once all questions are asked.
 */
export function selectNextAdaptiveQuestion(
  concepts: Concept[],
  prerequisites: PrerequisiteEdge[],
  questions: Question[],
  confidenceMap: Record<string, number | undefined>,
  askedQuestionIds: string[]
): {
  question: Question | null;
  meta: AdaptiveSelectionMeta;
  resetCycle: boolean;
} {
  if (!questions || questions.length === 0) {
    return {
      question: null,
      meta: {
        selectedConceptId: '',
        selectedConceptName: 'No questions',
        reason: 'Question bank is empty',
        isPrerequisiteIntervention: false,
        conceptConfidence: 0.5,
      },
      resetCycle: false,
    };
  }

  // Check if all questions have been asked; if so, permit repeating
  let activeAskedIds = [...askedQuestionIds];
  let resetCycle = false;
  const unaskedTotal = questions.filter((q) => !activeAskedIds.includes(q.id));

  if (unaskedTotal.length === 0) {
    activeAskedIds = [];
    resetCycle = true;
  }

  // On session start with no questions asked yet, always present the primary target question (questions[0])
  if (activeAskedIds.length === 0 && questions.length > 0) {
    const primaryQ = questions[0];
    const targetConcept = concepts.find((c) => c.id === primaryQ.conceptId);
    return {
      question: primaryQ,
      meta: {
        selectedConceptId: primaryQ.conceptId,
        selectedConceptName: targetConcept?.name || primaryQ.conceptName || 'Diagnostic Evaluation',
        reason: `Primary Target: Directly evaluating understanding of "${primaryQ.conceptName || targetConcept?.name}".`,
        isPrerequisiteIntervention: false,
        conceptConfidence: confidenceMap[primaryQ.conceptId] ?? 0.5,
      },
      resetCycle: false,
    };
  }

  // Calculate in-degree (prerequisites count)
  const inDegree: Record<string, number> = {};
  concepts.forEach((c) => { inDegree[c.id] = 0; });
  (prerequisites || []).forEach((p) => {
    if (inDegree[p.target] !== undefined) {
      inDegree[p.target] = inDegree[p.target] + 1;
    }
  });

  // Rank concepts by adaptive pedagogical need
  const conceptScores = concepts.map((c) => {
    const rawConf = confidenceMap[c.id];
    const status = getConceptStatus(rawConf);
    const importance = c.importance || 3;
    const prereqsCount = inDegree[c.id] || 0;

    let priorityScore = 0;
    if (status === 'prereq_gap') {
      // Highest priority: actively diagnosed misconception or gap
      priorityScore = 30 + (1 - (rawConf || 0.2)) * 10 + importance;
    } else if (status === 'unassessed') {
      // High priority: unassessed concepts (foundational roots first)
      const isRoot = prereqsCount === 0;
      priorityScore = 20 + (isRoot ? 8 : 0) - prereqsCount * 1.5 + importance;
    } else if (status === 'developing') {
      // Moderate priority: progressing concepts
      priorityScore = 12 + (1 - (rawConf || 0.6)) * 10 + importance;
    } else {
      // Mastered or prereq_verified: lowest priority
      priorityScore = 2 + importance;
    }

    return {
      concept: c,
      confidence: rawConf,
      status,
      importance,
      priorityScore,
    };
  });

  // Sort concepts descending by priority score
  conceptScores.sort((a, b) => b.priorityScore - a.priorityScore);

  const primaryTarget = conceptScores[0];
  const primaryConceptId = primaryTarget.concept.id;

  // Build prerequisite map: which concepts are prerequisites of primaryConceptId?
  const prereqEdges = (prerequisites || []).filter((p) => p.target === primaryConceptId);
  const prereqConceptIds = prereqEdges.map((p) => p.source);

  // Check if any prerequisite has a diagnosed gap (< 0.50) or is unassessed while primary is not
  const weakPrereqs = conceptScores.filter(
    (cs) => prereqConceptIds.includes(cs.concept.id) && (cs.status === 'prereq_gap' || (cs.status === 'unassessed' && primaryTarget.status !== 'unassessed'))
  );

  // If a weak prerequisite exists, reinforce prerequisite foundations first
  if (weakPrereqs.length > 0) {
    const weakestPrereq = weakPrereqs[0];
    const prereqQuestions = questions.filter(
      (q) =>
        (q.conceptId === weakestPrereq.concept.id ||
          q.targetPrerequisiteOf === primaryConceptId ||
          (q.isPrerequisiteCheck && q.conceptId === weakestPrereq.concept.id)) &&
        !activeAskedIds.includes(q.id)
    );

    if (prereqQuestions.length > 0) {
      const bestPrereqQ =
        prereqQuestions.find((q) => q.difficulty === 'foundational') || prereqQuestions[0];

      return {
        question: bestPrereqQ,
        meta: {
          selectedConceptId: weakestPrereq.concept.id,
          selectedConceptName: weakestPrereq.concept.name,
          reason: `Prerequisite Gap Detected: Foundational prerequisite "${weakestPrereq.concept.name}" must be validated before mastering "${primaryTarget.concept.name}". Reinforcing prerequisite foundations.`,
          isPrerequisiteIntervention: true,
          prerequisiteFor: primaryTarget.concept.name,
          conceptConfidence: weakestPrereq.confidence ?? 0.5,
        },
        resetCycle,
      };
    }
  }

  // Look for unasked questions directly for the primary target concept
  const targetQuestions = questions.filter(
    (q) => q.conceptId === primaryConceptId && !activeAskedIds.includes(q.id)
  );

  if (targetQuestions.length > 0) {
    let chosenQ: Question;
    const currentConf = primaryTarget.confidence;

    if (currentConf === undefined || currentConf < 0.5) {
      chosenQ =
        targetQuestions.find((q) => q.difficulty === 'foundational') ||
        targetQuestions.find((q) => q.difficulty === 'intermediate') ||
        targetQuestions[0];
    } else if (currentConf < 0.75) {
      chosenQ =
        targetQuestions.find((q) => q.difficulty === 'intermediate') ||
        targetQuestions.find((q) => q.difficulty === 'foundational') ||
        targetQuestions[0];
    } else {
      chosenQ =
        targetQuestions.find((q) => q.difficulty === 'advanced') ||
        targetQuestions.find((q) => q.difficulty === 'intermediate') ||
        targetQuestions[0];
    }

    const reason =
      primaryTarget.status === 'unassessed'
        ? `Initial Diagnostic: "${primaryTarget.concept.name}" is currently unassessed. Evaluating to establish baseline in prerequisite graph.`
        : primaryTarget.status === 'prereq_gap'
        ? `Target Intervention: Identified gap in "${primaryTarget.concept.name}" (${Math.round(
            (currentConf || 0.25) * 100
          )}%). Targeted diagnostic question to address misconceptions.`
        : `Progress Reinforcement: Practicing "${primaryTarget.concept.name}" to advance from developing to full mastery.`;

    return {
      question: chosenQ,
      meta: {
        selectedConceptId: primaryConceptId,
        selectedConceptName: primaryTarget.concept.name,
        reason,
        isPrerequisiteIntervention: false,
        conceptConfidence: primaryTarget.confidence ?? 0.5,
      },
      resetCycle,
    };
  }

  // If primary target has no unasked questions, iterate through remaining concepts in priority order
  for (const cs of conceptScores) {
    const candidateQuestions = questions.filter(
      (q) => q.conceptId === cs.concept.id && !activeAskedIds.includes(q.id)
    );
    if (candidateQuestions.length > 0) {
      return {
        question: candidateQuestions[0],
        meta: {
          selectedConceptId: cs.concept.id,
          selectedConceptName: cs.concept.name,
          reason: cs.status === 'unassessed'
            ? `Baseline Diagnostic: Evaluating "${cs.concept.name}" in prerequisite graph.`
            : `Progressive Mastery: Advancing knowledge in "${cs.concept.name}" (${Math.round((cs.confidence || 0.5) * 100)}%).`,
          isPrerequisiteIntervention: false,
          conceptConfidence: cs.confidence ?? 0.5,
        },
        resetCycle,
      };
    }
  }

  // Fallback if any unasked question exists at all
  const remaining = questions.filter((q) => !activeAskedIds.includes(q.id));
  const fallbackQ = remaining[0] || questions[0];
  const fallbackConcept = concepts.find((c) => c.id === fallbackQ.conceptId);

  return {
    question: fallbackQ,
    meta: {
      selectedConceptId: fallbackQ.conceptId,
      selectedConceptName: fallbackConcept?.name || fallbackQ.conceptName,
      reason: `Reviewing available assessment items for curriculum completion.`,
      isPrerequisiteIntervention: false,
      conceptConfidence: confidenceMap[fallbackQ.conceptId] ?? 0.5,
    },
    resetCycle,
  };
}
