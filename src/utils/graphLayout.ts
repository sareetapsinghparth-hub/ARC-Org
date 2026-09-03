import { Concept, PrerequisiteEdge, ConceptMasteryStatus } from '../types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { getConceptStatus } from './kGraphJudgment';

export interface ConceptNodeData extends Record<string, unknown> {
  concept: Concept;
  confidence?: number;
  isAssessed: boolean;
  status: ConceptMasteryStatus;
  isVerifiedPrereq?: boolean;
  isNextTarget: boolean;
  isSelected: boolean;
  viewMode?: 'standard' | 'heatmap';
  onSelectConcept?: (conceptId: string) => void;
}

/**
 * Calculates a clean hierarchical DAG layout for concepts and directed prerequisite edges.
 */
export function buildFlowGraph(
  concepts: Concept[],
  prerequisites: PrerequisiteEdge[],
  confidenceMap: Record<string, number | undefined>,
  verifiedPrereqMap: Record<string, boolean> = {},
  nextTargetConceptId: string | null = null,
  selectedConceptId: string | null = null,
  viewMode: 'standard' | 'heatmap' = 'standard',
  onSelectConcept?: (conceptId: string) => void,
  showEdgeLabels: boolean = false
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  // Safe concept map
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // Only keep valid prerequisites where both source and target concepts exist
  const validPrerequisites = (prerequisites || []).filter(
    (p) => conceptMap.has(p.source) && conceptMap.has(p.target)
  );

  // Build adjacency list & in-degrees
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  concepts.forEach((c) => {
    inDegree[c.id] = 0;
    adjList[c.id] = [];
  });

  validPrerequisites.forEach((p) => {
    inDegree[p.target] = (inDegree[p.target] || 0) + 1;
    adjList[p.source].push(p.target);
  });

  // Calculate topological levels (Rank) with Kahn's algorithm + cycle protection
  const levels: Record<string, number> = {};
  const inDegreeCopy = { ...inDegree };
  const queue: string[] = [];

  // Start with root prerequisites (in-degree 0)
  concepts.forEach((c) => {
    if (inDegreeCopy[c.id] === 0) {
      levels[c.id] = 0;
      queue.push(c.id);
    }
  });

  let processedCount = 0;
  const maxIterations = Math.max(50, concepts.length * 4);

  while (queue.length > 0 && processedCount < maxIterations) {
    processedCount++;
    const curr = queue.shift()!;
    const currLevel = levels[curr] || 0;
    const neighbors = adjList[curr] || [];

    for (const next of neighbors) {
      const nextLevel = Math.max(levels[next] || 0, currLevel + 1);
      levels[next] = nextLevel;
      inDegreeCopy[next] = (inDegreeCopy[next] || 1) - 1;
      if (inDegreeCopy[next] <= 0) {
        queue.push(next);
      }
    }
  }

  // Gracefully assign levels for any nodes that were in cycles or unvisited
  concepts.forEach((c, idx) => {
    if (levels[c.id] === undefined) {
      levels[c.id] = idx % 3;
    }
  });

  // Group concepts by level
  const levelGroups: Record<number, Concept[]> = {};
  concepts.forEach((c) => {
    const lvl = levels[c.id] ?? 0;
    if (!levelGroups[lvl]) {
      levelGroups[lvl] = [];
    }
    levelGroups[lvl].push(c);
  });

  // Calculate positions: horizontal layout (X = level * 360, Y distributed)
  const nodes: Node<ConceptNodeData>[] = [];
  const xSpacing = 360;
  const ySpacing = 200;

  Object.entries(levelGroups).forEach(([lvlStr, groupConcepts]) => {
    const lvl = parseInt(lvlStr, 10);
    const count = groupConcepts.length;
    const totalHeight = (count - 1) * ySpacing;
    const startY = -totalHeight / 2 + 100;

    groupConcepts.forEach((c, idx) => {
      const rawConf = confidenceMap[c.id];
      const isAssessed = rawConf !== undefined && rawConf !== null;
      const isVerified = Boolean(verifiedPrereqMap[c.id]);
      const status = getConceptStatus(rawConf, isVerified);
      const isNextTarget = c.id === nextTargetConceptId;
      const isSelected = c.id === selectedConceptId;

      nodes.push({
        id: c.id,
        type: 'conceptNode',
        position: {
          x: lvl * xSpacing + 50,
          y: startY + idx * ySpacing,
        },
        data: {
          concept: c,
          confidence: rawConf,
          isAssessed,
          status,
          isVerifiedPrereq: isVerified,
          isNextTarget,
          isSelected,
          viewMode,
          onSelectConcept,
        },
      });
    });
  });

  // Generate directed edges
  const edges: Edge[] = validPrerequisites.map((p, idx) => {
    const isConnectingToTarget = p.target === nextTargetConceptId;
    const sourceConf = confidenceMap[p.source];
    const isSourceAssessed = sourceConf !== undefined && sourceConf !== null;
    const isWeakPrereq = isSourceAssessed && sourceConf < 0.5;
    const isSourceMastered = isSourceAssessed && sourceConf >= 0.75;

    let edgeColor = '#94a3b8'; // neutral slate
    if (viewMode === 'heatmap') {
      if (isWeakPrereq) edgeColor = '#dc2626';
      else if (isSourceMastered) edgeColor = '#2563eb';
      else if (isSourceAssessed) edgeColor = '#d97706';
    } else {
      if (isWeakPrereq) edgeColor = '#ef4444';
      else if (isSourceMastered) edgeColor = '#10b981';
      else if (isConnectingToTarget) edgeColor = '#4f46e5';
    }

    const edge: Edge = {
      id: `edge-${p.source}-${p.target}-${idx}`,
      source: p.source,
      target: p.target,
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'smoothstep',
      animated: isConnectingToTarget || isWeakPrereq,
      style: {
        stroke: edgeColor,
        strokeWidth: isConnectingToTarget ? 2.5 : 1.75,
        strokeDasharray: isWeakPrereq ? '4,4' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: edgeColor,
      },
    };

    if (showEdgeLabels && p.relation) {
      edge.label = p.relation;
      edge.labelStyle = { fill: '#64748b', fontSize: 11, fontWeight: 500 };
    }

    return edge;
  });

  return { nodes, edges };
}
