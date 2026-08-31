import { Concept, PrerequisiteEdge } from '../types';
import { Node, Edge, MarkerType } from '@xyflow/react';

export interface ConceptNodeData extends Record<string, unknown> {
  concept: Concept;
  confidence: number;
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
  confidenceMap: Record<string, number>,
  nextTargetConceptId: string | null,
  selectedConceptId: string | null,
  viewMode: 'standard' | 'heatmap' = 'standard',
  onSelectConcept?: (conceptId: string) => void
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  // Build adjacency list to calculate topological depth / rank
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  concepts.forEach((c) => {
    inDegree[c.id] = 0;
    adjList[c.id] = [];
  });

  prerequisites.forEach((p) => {
    if (inDegree[p.target] !== undefined) {
      inDegree[p.target] = (inDegree[p.target] || 0) + 1;
    }
    if (adjList[p.source]) {
      adjList[p.source].push(p.target);
    }
  });

  // Calculate topological levels (Rank)
  const levels: Record<string, number> = {};
  const queue: string[] = [];

  // Start with root prerequisites (in-degree 0)
  concepts.forEach((c) => {
    if (inDegree[c.id] === 0) {
      levels[c.id] = 0;
      queue.push(c.id);
    }
  });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLevel = levels[curr] || 0;
    const neighbors = adjList[curr] || [];

    for (const next of neighbors) {
      const nextLevel = Math.max(levels[next] || 0, currLevel + 1);
      levels[next] = nextLevel;
      queue.push(next);
    }
  }

  // Group concepts by level
  const levelGroups: Record<number, Concept[]> = {};
  concepts.forEach((c) => {
    const lvl = levels[c.id] ?? 0;
    if (!levelGroups[lvl]) {
      levelGroups[lvl] = [];
    }
    levelGroups[lvl].push(c);
  });

  // Calculate positions: horizontal layout (X = level * 340, Y distributed)
  const nodes: Node<ConceptNodeData>[] = [];
  const nodeWidth = 260;
  const nodeHeight = 160;
  const xSpacing = 360;
  const ySpacing = 200;

  Object.entries(levelGroups).forEach(([lvlStr, groupConcepts]) => {
    const lvl = parseInt(lvlStr, 10);
    const count = groupConcepts.length;
    const totalHeight = (count - 1) * ySpacing;
    const startY = -totalHeight / 2 + 100;

    groupConcepts.forEach((c, idx) => {
      const conf = confidenceMap[c.id] ?? c.confidence ?? 0.5;
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
          confidence: conf,
          isNextTarget,
          isSelected,
          viewMode,
          onSelectConcept,
        },
      });
    });
  });

  // Generate directed edges
  const edges: Edge[] = prerequisites.map((p, idx) => {
    const isConnectingToTarget = p.target === nextTargetConceptId;
    const sourceConf = confidenceMap[p.source] ?? 0.5;
    const isWeakPrereq = sourceConf < 0.4;

    const edgeColor =
      viewMode === 'heatmap'
        ? isWeakPrereq
          ? '#ef4444'
          : sourceConf >= 0.7
          ? '#3b82f6'
          : '#f59e0b'
        : isWeakPrereq
        ? '#f87171'
        : isConnectingToTarget
        ? '#818cf8'
        : '#475569';

    return {
      id: `edge-${p.source}-${p.target}-${idx}`,
      source: p.source,
      target: p.target,
      type: 'smoothstep',
      animated: isConnectingToTarget || (viewMode === 'heatmap' && isWeakPrereq),
      label: p.relation,
      labelStyle: { fill: '#94a3b8', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85, rx: 4, ry: 4 },
      labelBgPadding: [6, 4] as [number, number],
      style: {
        stroke: edgeColor,
        strokeWidth: isConnectingToTarget ? 2.5 : viewMode === 'heatmap' ? 2 : 1.5,
        strokeDasharray: isWeakPrereq ? '4,4' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: edgeColor,
      },
    };
  });

  return { nodes, edges };
}
