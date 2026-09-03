import { Concept, PrerequisiteEdge, ConceptMasteryStatus, GraphDiagnosticUpdate } from '../types';

/**
 * Determines qualitative and quantitative diagnostic status for any concept.
 * Avoids arbitrary 50% / 40% initializations for unassessed concepts.
 */
export function getConceptStatus(
  confidence: number | undefined | null,
  isPrereqVerified: boolean = false
): ConceptMasteryStatus {
  if (confidence === undefined || confidence === null) {
    return 'unassessed';
  }
  if (isPrereqVerified && confidence >= 0.75) {
    return 'prereq_verified';
  }
  if (confidence >= 0.75) {
    return 'mastered';
  }
  if (confidence >= 0.45) {
    return 'developing';
  }
  return 'prereq_gap';
}

/**
 * Returns human-readable label and styling classes for a concept's diagnostic status.
 */
export function getStatusBadgeInfo(status: ConceptMasteryStatus) {
  switch (status) {
    case 'mastered':
      return {
        label: 'Mastered',
        shortLabel: 'Mastered',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-300',
        dotColor: 'bg-emerald-500',
      };
    case 'prereq_verified':
      return {
        label: 'Prerequisite Verified',
        shortLabel: 'Verified',
        bgColor: 'bg-teal-50',
        textColor: 'text-teal-700',
        borderColor: 'border-teal-300',
        dotColor: 'bg-teal-500',
      };
    case 'developing':
      return {
        label: 'Developing',
        shortLabel: 'Developing',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-300',
        dotColor: 'bg-amber-500',
      };
    case 'prereq_gap':
      return {
        label: 'Prerequisite Gap',
        shortLabel: 'Gap',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-300',
        dotColor: 'bg-rose-500',
      };
    case 'unassessed':
    default:
      return {
        label: 'Unassessed',
        shortLabel: 'Pending',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-200',
        dotColor: 'bg-slate-300',
      };
  }
}

/**
 * Traverses the prerequisite DAG backwards from a target concept to discover all upstream ancestor prerequisites.
 */
export function getAncestorPrerequisites(
  targetConceptId: string,
  prerequisites: PrerequisiteEdge[]
): string[] {
  const ancestors = new Set<string>();
  const queue = [targetConceptId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directPrereqEdges = prerequisites.filter((p) => p.target === current);

    for (const edge of directPrereqEdges) {
      if (!ancestors.has(edge.source)) {
        ancestors.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return Array.from(ancestors);
}

/**
 * Core Prerequisite Graph (K-Graph) Diagnostic Evaluation:
 * When a user's answer is evaluated, this function judges both:
 * 1. The specific target concept directly from the response score.
 * 2. The entire prerequisite graph DAG (propagating validation or flagging prerequisite gaps).
 */
export function evaluateGraphJudgment(
  concepts: Concept[],
  prerequisites: PrerequisiteEdge[],
  currentConfidenceMap: Record<string, number | undefined>,
  verifiedPrereqMap: Record<string, boolean>,
  targetConceptId: string,
  status: 'correct' | 'partly correct' | 'incorrect',
  score: number
): {
  updatedConfidenceMap: Record<string, number>;
  updatedVerifiedPrereqMap: Record<string, boolean>;
  diagnosticUpdate: GraphDiagnosticUpdate;
} {
  const updatedConfidenceMap: Record<string, number> = {
    ...Object.fromEntries(
      Object.entries(currentConfidenceMap).filter(([, val]) => val !== undefined) as [string, number][]
    ),
  };
  const updatedVerifiedMap: Record<string, boolean> = { ...verifiedPrereqMap };

  const targetConcept = concepts.find((c) => c.id === targetConceptId);
  const targetName = targetConcept?.name || targetConceptId;

  // 1. Direct Target Concept Judgment
  let targetConfidence: number;
  let targetStatus: ConceptMasteryStatus;

  if (status === 'correct') {
    targetConfidence = Math.max(0.85, Math.min(1.0, Number((score >= 0.85 ? score : 0.85).toFixed(2))));
    targetStatus = 'mastered';
    updatedConfidenceMap[targetConceptId] = targetConfidence;
    delete updatedVerifiedMap[targetConceptId]; // Directly mastered, not just inferred
  } else if (status === 'partly correct') {
    targetConfidence = Math.max(0.45, Math.min(0.70, Number((score || 0.55).toFixed(2))));
    targetStatus = 'developing';
    updatedConfidenceMap[targetConceptId] = targetConfidence;
  } else {
    targetConfidence = Math.max(0.15, Math.min(0.35, Number((score <= 0.35 ? score : 0.25).toFixed(2))));
    targetStatus = 'prereq_gap';
    updatedConfidenceMap[targetConceptId] = targetConfidence;
  }

  // 2. Prerequisite Graph DAG Inference
  const verifiedPrereqIds: string[] = [];
  const flaggedGapPrereqIds: string[] = [];
  let reasoning = '';

  if (status === 'correct') {
    // Upstream prerequisites validation: solving targetConceptId demonstrates foundational competence
    const ancestors = getAncestorPrerequisites(targetConceptId, prerequisites);

    for (const prereqId of ancestors) {
      const existingConf = updatedConfidenceMap[prereqId];
      // If the prerequisite was unassessed or below 0.80, validate it via downstream success
      if (existingConf === undefined || existingConf < 0.80) {
        updatedConfidenceMap[prereqId] = 0.85;
        updatedVerifiedMap[prereqId] = true;
        verifiedPrereqIds.push(prereqId);
      }
    }

    if (verifiedPrereqIds.length > 0) {
      const verifiedNames = verifiedPrereqIds
        .map((id) => concepts.find((c) => c.id === id)?.name || id)
        .join(', ');
      reasoning = `Answer judged correct. Successfully solving "${targetName}" directly confirmed foundational understanding in prerequisite graph: ${verifiedNames}.`;
    } else {
      reasoning = `Answer judged correct. Demonstrated mastery in "${targetName}" (${Math.round(targetConfidence * 100)}%).`;
    }
  } else if (status === 'incorrect') {
    // Identify potential prerequisite breakdown in direct incoming prerequisites
    const directPrereqs = prerequisites.filter((p) => p.target === targetConceptId);

    for (const edge of directPrereqs) {
      const prereqConf = updatedConfidenceMap[edge.source];
      // If prerequisite was never directly proven (> 0.75), flag it as a potential gap
      if (prereqConf === undefined || prereqConf < 0.75) {
        flaggedGapPrereqIds.push(edge.source);
      }
    }

    if (flaggedGapPrereqIds.length > 0) {
      const gapNames = flaggedGapPrereqIds
        .map((id) => concepts.find((c) => c.id === id)?.name || id)
        .join(', ');
      reasoning = `Incorrect answer logged on "${targetName}". Knowledge graph flagged potential prerequisite gap in: ${gapNames}. Adaptive engine will prioritize verifying foundational prerequisite.`;
    } else {
      reasoning = `Misconception detected in "${targetName}". Marked for targeted review.`;
    }
  } else {
    reasoning = `Partial solution evaluated on "${targetName}". Developing conceptual grasp, practicing intermediate reinforcement.`;
  }

  return {
    updatedConfidenceMap,
    updatedVerifiedPrereqMap: updatedVerifiedMap,
    diagnosticUpdate: {
      targetConceptId,
      targetStatus,
      targetConfidence,
      verifiedPrereqIds,
      flaggedGapPrereqIds,
      reasoning,
    },
  };
}
