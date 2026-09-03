import React, { useState } from 'react';
import { Concept, PrerequisiteEdge } from '../types';
import { KnowledgeGraph } from './KnowledgeGraph';
import { X, GitFork, Sparkles, Flame, Snowflake, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface GraphSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  confidenceMap: Record<string, number | undefined>;
  verifiedPrereqMap?: Record<string, boolean>;
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
  verifiedPrereqMap = {},
  nextTargetConceptId,
  selectedConceptId,
  onSelectConcept,
}: GraphSidebarProps) {
  const [viewMode, setViewMode] = useState<'standard' | 'heatmap'>('standard');

  if (!isOpen) return null;

  const assessedConcepts = concepts.filter(
    (c) => confidenceMap[c.id] !== undefined && confidenceMap[c.id] !== null
  );
  const confidences = assessedConcepts.map((c) => confidenceMap[c.id] as number);
  const masteredCount = confidences.filter((c) => c >= 0.75).length;
  const reviewCount = confidences.filter((c) => c < 0.5).length;
  const developingCount = confidences.filter((c) => c >= 0.5 && c < 0.75).length;
  const unassessedCount = concepts.length - assessedConcepts.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer / Sidebar Panel */}
      <aside className="relative w-full max-w-2xl lg:max-w-3xl bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col h-full animate-slideLeft">
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}
            >
              {viewMode === 'heatmap' ? <Flame className="w-5 h-5 text-red-600" /> : <GitFork className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {viewMode === 'heatmap' ? 'Diagnostic Heatmap Graph' : 'Prerequisite Knowledge Graph'}
                </h3>
                <span
                  className={`text-[10px] font-mono border px-2 py-0.5 rounded-full font-semibold ${
                    viewMode === 'heatmap'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {viewMode === 'heatmap' ? 'Heatmap Active' : 'Standard View'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {viewMode === 'heatmap'
                  ? 'Color-coded by urgency: Hot Red (Prerequisite gap) to Cool Blue (Mastered)'
                  : 'Topological prerequisite concept pathways and dependencies'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`py-1 px-2.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-gradient-to-r from-red-600 to-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-200" />
                <span>Heatmap</span>
              </button>
            </div>

            <button
              onClick={onClose}
              id="close-graph-sidebar-btn"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Close Graph Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Concept Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-600 truncate max-w-[200px] sm:max-w-none">
            {concepts.length} Concept Nodes • {prerequisites.length} Dependencies
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {unassessedCount > 0 && (
              <span className="text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                {unassessedCount} Unassessed
              </span>
            )}
            {masteredCount > 0 && (
              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {masteredCount} Mastered
              </span>
            )}
            {reviewCount > 0 && (
              <span className="text-rose-600 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {reviewCount} Gap
              </span>
            )}
          </div>
        </div>

        {/* Interactive Knowledge Graph Canvas */}
        <div
          className="flex-1 min-h-0 relative p-3 bg-slate-100/40 flex flex-col"
          style={{ minHeight: '450px', height: '100%', width: '100%' }}
        >
          <KnowledgeGraph
            concepts={concepts}
            prerequisites={prerequisites}
            confidenceMap={confidenceMap}
            verifiedPrereqMap={verifiedPrereqMap}
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
