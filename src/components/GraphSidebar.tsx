import React, { useState } from 'react';
import { Concept, PrerequisiteEdge } from '../types';
import { KnowledgeGraph } from './KnowledgeGraph';
import { X, GitFork, Sparkles, Flame, Snowflake, CheckCircle2, AlertTriangle } from 'lucide-react';

interface GraphSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  confidenceMap: Record<string, number>;
  nextTargetConceptId: string | null;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
}

export function GraphSidebar({
  isOpen,
  onClose,
  concepts,
  prerequisites,
  confidenceMap,
  nextTargetConceptId,
  selectedConceptId,
  onSelectConcept,
}: GraphSidebarProps) {
  const [viewMode, setViewMode] = useState<'standard' | 'heatmap'>('heatmap');

  if (!isOpen) return null;

  const confidences = concepts.map((c) => confidenceMap[c.id] ?? c.confidence ?? 0.5);
  const masteredCount = confidences.filter((c) => c >= 0.7).length;
  const reviewCount = confidences.filter((c) => c < 0.4).length;
  const developingCount = confidences.filter((c) => c >= 0.4 && c < 0.7).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer / Sidebar Panel */}
      <aside className="relative w-full max-w-2xl lg:max-w-3xl bg-slate-900 border-l border-slate-800 shadow-2xl z-10 flex flex-col h-full animate-slideLeft">
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-gradient-to-br from-red-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {viewMode === 'heatmap' ? <Flame className="w-5 h-5 text-red-400" /> : <GitFork className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  {viewMode === 'heatmap' ? 'Diagnostic Heatmap Graph' : 'Prerequisite Knowledge Graph'}
                </h3>
                <span
                  className={`text-[10px] font-mono border px-2 py-0.5 rounded-full font-semibold ${
                    viewMode === 'heatmap'
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {viewMode === 'heatmap' ? 'Heatmap Active' : 'Standard View'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {viewMode === 'heatmap'
                  ? 'Color-coded by urgency: Hot Red (Needs attention) to Cool Blue (Mastered)'
                  : 'Topological prerequisite concept pathways and dependencies'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`py-1 px-2.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('heatmap')}
                className={`py-1 px-2.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'heatmap'
                    ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-300" />
                <span>Heatmap</span>
              </button>
            </div>

            <button
              onClick={onClose}
              id="close-graph-sidebar-btn"
              className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Close Graph Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Concept Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 truncate max-w-[200px] sm:max-w-none">
            {concepts.length} Concept Nodes • {prerequisites.length} Dependencies
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {viewMode === 'heatmap' ? (
              <>
                {reviewCount > 0 && (
                  <span className="text-red-400 flex items-center gap-1 font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    {reviewCount} Hot / Urgency
                  </span>
                )}
                {developingCount > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {developingCount} Developing
                  </span>
                )}
                <span className="text-cyan-400 flex items-center gap-1 font-bold">
                  <Snowflake className="w-3.5 h-3.5" />
                  {masteredCount} Cool / Mastered
                </span>
              </>
            ) : (
              <>
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {masteredCount} Mastered
                </span>
                {reviewCount > 0 && (
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {reviewCount} Review
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Interactive Knowledge Graph Canvas */}
        <div className="flex-1 min-h-0 relative p-3">
          <KnowledgeGraph
            concepts={concepts}
            prerequisites={prerequisites}
            confidenceMap={confidenceMap}
            nextTargetConceptId={nextTargetConceptId}
            selectedConceptId={selectedConceptId}
            viewMode={viewMode}
            onSelectConcept={onSelectConcept}
            onToggleViewMode={(mode) => setViewMode(mode)}
          />
        </div>
      </aside>
    </div>
  );
}
