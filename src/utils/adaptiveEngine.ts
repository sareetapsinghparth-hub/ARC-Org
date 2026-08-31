import { Concept, PrerequisiteEdge, Question, AdaptiveSelectionMeta } from '../types';

/**
 * Deterministic Adaptive Selection Engine for ARC (Adaptive Reasoning Model)
 * 
 * Priority Rules:
 * 1. Identify the lowest-confidence concept (weighted by importance 1-5).
 * 2. Check if this concept has any weak prerequisite (confidence < 0.6).
 *    If so, prioritize foundational/prerequisite questions for the weak prerequisite first.
 * 3. Never repeat an already asked question while unasked questions remain.
 * 4. Permit repetition only once all questions in the bank have been asked.
 */
export function selectNextAdaptiveQuestion(
  concepts: Concept[],
  prerequisites: PrerequisiteEdge[],
  questions: Question[],
  confidenceMap: Record<string, number>,
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
    // All questions have been asked -> Reset asked pool for reinforced mastery
    activeAskedIds = [];
    resetCycle = true;
  }

  // Rank concepts by need: lowest confidence first, breaking ties with highest importance
  const conceptScores = concepts.map((c) => {
    const conf = confidenceMap[c.id] ?? c.confidence ?? 0.5;
    // Score formula: lower confidence gives higher priority, boosted by importance
    // Score = (1 - conf) * 10 + importance
    const priorityScore = (1 - conf) * 10 + (c.importance || 3);
    return {
      concept: c,
      confidence: conf,
      importance: c.importance || 3,
      priorityScore,
    };
  });

  // Sort concepts descending by priority score (most urgent concept first)
  conceptScores.sort((a, b) => b.priorityScore - a.priorityScore);

  const primaryTarget = conceptScores[0];
  const primaryConceptId = primaryTarget.concept.id;

  // Build prerequisite map: which concepts are prerequisites of primaryConceptId?
  const prereqEdges = prerequisites.filter((p) => p.target === primaryConceptId);
  const prereqConceptIds = prereqEdges.map((p) => p.source);

  // Check if any prerequisite has weak confidence (< 0.60 or lower than target)
  const weakPrereqs = conceptScores.filter(
    (cs) => prereqConceptIds.includes(cs.concept.id) && cs.confidence < 0.6
  );

  // If a weak prerequisite exists, check if there are unasked questions for it
  if (weakPrereqs.length > 0) {
    // Pick the lowest-confidence prerequisite
    const weakestPrereq = weakPrereqs[0];
    const prereqQuestions = questions.filter(
      (q) =>
        (q.conceptId === weakestPrereq.concept.id ||
          q.targetPrerequisiteOf === primaryConceptId ||
          (q.isPrerequisiteCheck && q.conceptId === weakestPrereq.concept.id)) &&
        !activeAskedIds.includes(q.id)
    );

    if (prereqQuestions.length > 0) {
      // Choose foundational first if available
      const bestPrereqQ =
        prereqQuestions.find((q) => q.difficulty === 'foundational') || prereqQuestions[0];

      return {
        question: bestPrereqQ,
        meta: {
          selectedConceptId: weakestPrereq.concept.id,
          selectedConceptName: weakestPrereq.concept.name,
          reason: `Prerequisite Gap Detected: "${weakestPrereq.concept.name}" has ${Math.round(
            weakestPrereq.confidence * 100
          )}% confidence, which blocks mastery of "${primaryTarget.concept.name}". Reinforcing prerequisite foundations first.`,
          isPrerequisiteIntervention: true,
          prerequisiteFor: primaryTarget.concept.name,
          conceptConfidence: weakestPrereq.confidence,
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
    // Choose question based on confidence level
    let chosenQ: Question;
    if (primaryTarget.confidence < 0.4) {
      chosenQ =
        targetQuestions.find((q) => q.difficulty === 'foundational') ||
        targetQuestions.find((q) => q.difficulty === 'intermediate') ||
        targetQuestions[0];
    } else if (primaryTarget.confidence < 0.7) {
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

    return {
      question: chosenQ,
      meta: {
        selectedConceptId: primaryConceptId,
        selectedConceptName: primaryTarget.concept.name,
        reason: `Target Concept Focus: "${primaryTarget.concept.name}" has the lowest mastery score (${Math.round(
          primaryTarget.confidence * 100
        )}%) among key high-importance concepts (Importance: ${primaryTarget.importance}/5).`,
        isPrerequisiteIntervention: false,
        conceptConfidence: primaryTarget.confidence,
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
          reason: `Progressive Mastery: Advancing knowledge in "${cs.concept.name}" (Confidence: ${Math.round(
            cs.confidence * 100
          )}%).`,
          isPrerequisiteIntervention: false,
          conceptConfidence: cs.confidence,
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
