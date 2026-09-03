import React, { useMemo, useEffect, useCallback, useState } from 'react';
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
import { GitFork, Maximize2, Sparkles, Flame, Snowflake, Tag, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface KnowledgeGraphProps {
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  confidenceMap: Record<string, number | undefined>;
  verifiedPrereqMap?: Record<string, boolean>;
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
  verifiedPrereqMap = {},
  nextTargetConceptId,
  selectedConceptId,
  viewMode = 'standard',
  onSelectConcept,
  onToggleViewMode,
}: KnowledgeGraphProps) {
  const { fitView } = useReactFlow();
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildFlowGraph(
      concepts,
      prerequisites,
      confidenceMap,
      verifiedPrereqMap,
      nextTargetConceptId,
      selectedConceptId,
      viewMode,
      onSelectConcept,
      showEdgeLabels
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [concepts, prerequisites, confidenceMap, verifiedPrereqMap, nextTargetConceptId, selectedConceptId, viewMode, onSelectConcept, showEdgeLabels]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever concepts, confidences, viewMode or target changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(
      concepts,
      prerequisites,
      confidenceMap,
      verifiedPrereqMap,
      nextTargetConceptId,
      selectedConceptId,
      viewMode,
      onSelectConcept,
      showEdgeLabels
    );

    // Preserve existing node positions if user already moved them
    setNodes((prevNodes) => {
      const prevPosMap = new Map(prevNodes.map((n) => [n.id, n.position]));
      return newNodes.map((node) => {
        const prevPos = prevPosMap.get(node.id);
        return prevPos ? { ...node, position: prevPos } : node;
      });
    });
    setEdges(newEdges);
  }, [concepts, prerequisites, confidenceMap, verifiedPrereqMap, nextTargetConceptId, selectedConceptId, viewMode, onSelectConcept, showEdgeLabels, setNodes, setEdges]);

  const handleResetView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  const handleFlowError = useCallback((code: string, message: string) => {
    if (code === '002' || code === '004' || code === '008') {
      return;
    }
    console.warn(`[ReactFlow ${code}]:`, message);
  }, []);

  return (
    <div
      className="w-full h-full relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-md min-h-[450px]"
      style={{ width: '100%', height: '100%', minHeight: '450px' }}
    >
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
        onError={handleFlowError}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#cbd5e1" />
        <Controls className="!bg-white !border-slate-200 !text-slate-700 !shadow-md rounded-lg" />
        <MiniMap
          nodeColor={(n) => {
            const conf = n.data?.confidence as number | undefined;
            if (conf === undefined || conf === null) return '#94a3b8';
            if (viewMode === 'heatmap') {
              if (conf < 0.5) return '#ef4444';
              if (conf < 0.75) return '#f59e0b';
              return '#2563eb';
            }
            if (conf < 0.5) return '#ef4444';
            if (conf < 0.75) return '#f59e0b';
            return '#10b981';
          }}
          maskColor="rgba(241, 245, 249, 0.75)"
          className="!bg-white !border-slate-200 !rounded-xl !bottom-4 !right-4 !w-36 !h-28 !shadow-md"
        />

        {/* Legend & Mode Switcher Panel */}
        <Panel position="top-left" className="m-3">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-lg max-w-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                <span>{viewMode === 'heatmap' ? 'Heatmap Diagnostic' : 'Prerequisite K-Graph'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEdgeLabels((prev) => !prev)}
                  className={`text-[11px] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded cursor-pointer ${
                    showEdgeLabels
                      ? 'bg-indigo-100 text-indigo-700 font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-800'
                  }`}
                  title="Toggle Relation Badges"
                >
                  <Tag className="w-3 h-3" />
                  <span>{showEdgeLabels ? 'Labels: On' : 'Labels: Off'}</span>
                </button>
                <button
                  onClick={handleResetView}
                  className="text-[11px] text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  title="Reset Camera"
                >
                  <Maximize2 className="w-3 h-3" />
                  Fit
                </button>
              </div>
            </div>

            {/* View Mode Toggle Buttons */}
            {onToggleViewMode && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => onToggleViewMode('standard')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    viewMode === 'standard'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-gradient-to-r from-red-600 to-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3 h-3 text-red-500" />
                  <span>Heatmap</span>
                </button>
              </div>
            )}

            {/* Legend indicators */}
            {viewMode === 'heatmap' ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-1 rounded text-red-700 font-bold shadow-xs">
                    <Flame className="w-2.5 h-2.5 text-red-600 shrink-0" />
                    Gap (&lt;50%)
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-1 rounded text-amber-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    50-74%
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-1.5 py-1 rounded text-blue-700 font-bold shadow-xs">
                    <Snowflake className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                    Mastered
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  🔥 <strong>Hot Red:</strong> Prerequisite gap. ❄️ <strong>Cool Blue:</strong> Mastered concept.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-1.5 py-1 rounded text-slate-600">
                    <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Unassessed</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-1.5 py-1 rounded text-rose-700">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Prereq Gap</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-1.5 py-1 rounded text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Developing</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-1.5 py-1 rounded text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Mastered</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Arrows trace prerequisite dependencies. Directed testing updates node diagnosis.
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* Next Target Indicator Panel */}
        {nextTargetConceptId && (
          <Panel position="top-right" className="m-3">
            <div className="bg-white/95 backdrop-blur-md border border-indigo-200 rounded-xl px-3 py-2 shadow-md flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-xs text-indigo-800 font-medium">
                Live adaptive target highlighted in graph
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
