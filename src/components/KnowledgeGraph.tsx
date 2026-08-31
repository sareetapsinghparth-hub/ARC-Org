import React, { useMemo, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Concept, PrerequisiteEdge } from '../types';
import { buildFlowGraph } from '../utils/graphLayout';
import { ConceptNode } from './ConceptNode';
import { GitFork, Info, Maximize2, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Flame, Snowflake } from 'lucide-react';

interface KnowledgeGraphProps {
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  confidenceMap: Record<string, number>;
  nextTargetConceptId: string | null;
  selectedConceptId: string | null;
  viewMode?: 'standard' | 'heatmap';
  onSelectConcept: (conceptId: string) => void;
  onToggleViewMode?: (mode: 'standard' | 'heatmap') => void;
}

const nodeTypes = {
  conceptNode: ConceptNode,
};

function FlowInner({
  concepts,
  prerequisites,
  confidenceMap,
  nextTargetConceptId,
  selectedConceptId,
  viewMode = 'standard',
  onSelectConcept,
  onToggleViewMode,
}: KnowledgeGraphProps) {
  const { fitView } = useReactFlow();

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildFlowGraph(
      concepts,
      prerequisites,
      confidenceMap,
      nextTargetConceptId,
      selectedConceptId,
      viewMode,
      onSelectConcept
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [concepts, prerequisites, confidenceMap, nextTargetConceptId, selectedConceptId, viewMode, onSelectConcept]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever concepts, confidences, or target selection changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(
      concepts,
      prerequisites,
      confidenceMap,
      nextTargetConceptId,
      selectedConceptId,
      viewMode,
      onSelectConcept
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [concepts, prerequisites, confidenceMap, nextTargetConceptId, selectedConceptId, viewMode, onSelectConcept, setNodes, setEdges]);

  const handleResetView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  return (
    <div className="w-full h-full relative bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#334155" />
        <Controls className="!bg-slate-900 !border-slate-700 !text-slate-200 !shadow-lg rounded-lg" />
        <MiniMap
          nodeColor={(n) => {
            const conf = (n.data?.confidence as number) ?? 0.5;
            if (viewMode === 'heatmap') {
              if (conf < 0.4) return '#ef4444'; // Hot red
              if (conf < 0.7) return '#f59e0b'; // Amber
              return '#06b6d4'; // Cool cyan/blue
            }
            if (conf < 0.4) return '#ef4444';
            if (conf < 0.7) return '#f59e0b';
            return '#10b981';
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
          className="!bg-slate-900/90 !border-slate-800 !rounded-xl !bottom-4 !right-4 !w-36 !h-28"
        />

        {/* Legend & Mode Switcher Panel */}
        <Panel position="top-left" className="m-3">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl max-w-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                <span>{viewMode === 'heatmap' ? 'Heatmap Diagnostic Mode' : 'Prerequisite Graph'}</span>
              </div>
              <button
                onClick={handleResetView}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                title="Reset Camera"
              >
                <Maximize2 className="w-3 h-3" />
                Fit
              </button>
            </div>

            {/* View Mode Toggle Buttons */}
            {onToggleViewMode && (
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => onToggleViewMode('standard')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    viewMode === 'standard'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleViewMode('heatmap')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    viewMode === 'heatmap'
                      ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>Heatmap</span>
                </button>
              </div>
            )}

            {/* Legend indicators */}
            {viewMode === 'heatmap' ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1 bg-red-950/60 border border-red-700/60 px-1.5 py-1 rounded text-red-300 font-bold shadow-sm">
                    <Flame className="w-2.5 h-2.5 text-red-400 shrink-0" />
                    Hot (&lt;40%)
                  </div>
                  <div className="flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-1.5 py-1 rounded text-amber-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    40-69%
                  </div>
                  <div className="flex items-center gap-1 bg-cyan-950/60 border border-cyan-700/60 px-1.5 py-1 rounded text-cyan-300 font-bold shadow-sm">
                    <Snowflake className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    Cool (≥70%)
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  🔥 <strong>Hot Red:</strong> High urgency gap needing study priority. ❄️ <strong>Cool Blue:</strong> Mastered concept.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1 bg-red-950/40 border border-red-800/40 px-1.5 py-1 rounded text-red-300">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    &lt;40%
                  </div>
                  <div className="flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-1.5 py-1 rounded text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    40-69%
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-1 rounded text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    ≥70%
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Directed arrows show prerequisite pathways. Click any node to inspect concept.
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* Next Target Indicator Panel */}
        {nextTargetConceptId && (
          <Panel position="top-right" className="m-3">
            <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-xs text-indigo-200 font-medium">
                Live target highlighted in graph
              </span>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export function KnowledgeGraph(props: KnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
