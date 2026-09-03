import React, { useState } from 'react';
import { LessonData } from '../types';
import { DEFAULT_CURRICULA } from '../data/defaultCurricula';
import {
  Compass,
  Sparkles,
  RotateCcw,
  BookOpen,
  Cpu,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  TrendingUp,
  Radio,
  GitFork,
  MessageSquare,
  FileUp,
  FileText,
  Globe,
  PanelLeft,
  ArrowLeft,
} from 'lucide-react';

interface LessonHeaderProps {
  currentLesson: LessonData;
  confidenceMap: Record<string, number | undefined>;
  isLoadingLesson: boolean;
  onSelectPreset: (key: string) => void;
  onGenerateCustomLesson: (topic: string) => void;
  onResetConfidence: () => void;
  onOpenVoiceModal?: () => void;
  onOpenChatModal?: () => void;
  onOpenStudyPortal?: () => void;
  onToggleGraphSidebar?: () => void;
  isGraphSidebarOpen?: boolean;
  onToggleSessionsSidebar?: () => void;
  onGoHome?: () => void;
  isSessionActive?: boolean;
}

export function LessonHeader({
  currentLesson,
  confidenceMap,
  isLoadingLesson,
  onSelectPreset,
  onGenerateCustomLesson,
  onResetConfidence,
  onOpenVoiceModal,
  onOpenChatModal,
  onOpenStudyPortal,
  onToggleGraphSidebar,
  isGraphSidebarOpen = false,
  onToggleSessionsSidebar,
  onGoHome,
  isSessionActive = false,
}: LessonHeaderProps) {
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Compute aggregate statistics from actual assessed concepts
  const concepts = currentLesson.concepts || [];
  const totalConcepts = concepts.length;
  const assessedConcepts = concepts.filter(
    (c) => confidenceMap[c.id] !== undefined && confidenceMap[c.id] !== null
  );
  const assessedCount = assessedConcepts.length;
  const confidences = assessedConcepts.map((c) => confidenceMap[c.id] as number);
  const avgConfidence =
    assessedCount > 0
      ? Math.round((confidences.reduce((acc, v) => acc + v, 0) / assessedCount) * 100)
      : null;
  const masteredCount = confidences.filter((c) => c >= 0.75).length;
  const reviewCount = confidences.filter((c) => c < 0.5).length;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopicInput.trim() || isLoadingLesson) return;
    onGenerateCustomLesson(customTopicInput.trim());
    setShowCustomModal(false);
  };

  const presetEntries = Object.entries(DEFAULT_CURRICULA);

  // Detect current preset match or custom source
  const currentPresetMatch = presetEntries.find(
    ([, data]) => data.topic.toLowerCase() === currentLesson.topic.toLowerCase()
  );

  return (
    <header className="bg-white/90 border-b border-slate-200/80 backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-30 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Topic Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* History Sidebar Toggle */}
          {onToggleSessionsSidebar && (
            <button
              type="button"
              onClick={onToggleSessionsSidebar}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Toggle Learning History"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Go Home / Search button if session is active */}
          {isSessionActive && onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Return to Home & Web Search"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base shrink-0">
              ARC
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>

            {/* Curriculum Preset Selector */}
            <div className="relative flex items-center min-w-0">
              <select
                aria-label="Select curriculum preset"
                value={currentPresetMatch ? currentPresetMatch[0] : ''}
                onChange={(e) => {
                  if (e.target.value === '__open_portal__') {
                    if (onOpenStudyPortal) onOpenStudyPortal();
                    else setShowCustomModal(true);
                  } else if (e.target.value) {
                    onSelectPreset(e.target.value);
                  }
                }}
                disabled={isLoadingLesson}
                className="bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
              >
                {presetEntries.map(([key, data]) => (
                  <option key={key} value={key}>
                    {data.topic}
                  </option>
                ))}
                <option value="__open_portal__">+ New Topic or PDF...</option>
              </select>
            </div>

            {/* Source Pill (Web Search / PDF / Custom) */}
            {currentLesson.sourceType === 'web-search' && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[140px]">
                <Globe className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">Web Grounded</span>
              </span>
            )}
            {currentLesson.sourceType === 'pdf' && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[130px]">
                <FileUp className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentLesson.sourceName || 'PDF'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center / Right: Progress & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Subtle Mastery Progress Indicator */}
          <div
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
            title={
              avgConfidence !== null
                ? `${masteredCount} of ${totalConcepts} concepts mastered (${avgConfidence}% average across ${assessedCount} assessed concepts)`
                : `Curriculum unassessed (0 of ${totalConcepts} concepts tested)`
            }
          >
            <span className="text-slate-500 text-[11px] font-medium">Mastery:</span>
            {avgConfidence !== null ? (
              <>
                <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      avgConfidence >= 75
                        ? 'bg-emerald-500'
                        : avgConfidence >= 50
                        ? 'bg-indigo-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${avgConfidence}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-800 font-mono text-[11px]">
                  {avgConfidence}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({assessedCount}/{totalConcepts})
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-mono text-[11px]">
                Pending Diagnostic
              </span>
            )}
          </div>

          {/* Unified Tool Group */}
          <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80">
            {/* Knowledge Graph Button */}
            {onToggleGraphSidebar && (
              <button
                type="button"
                onClick={onToggleGraphSidebar}
                id="header-graph-toggle-btn"
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isGraphSidebarOpen
                    ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Knowledge Graph"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Graph</span>
              </button>
            )}

            {/* AI Tutor Chat */}
            {onOpenChatModal && (
              <button
                type="button"
                onClick={onOpenChatModal}
                id="header-ai-chat-btn"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer"
                title="AI Tutor Chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tutor</span>
              </button>
            )}

            {/* Real-time Voice */}
            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={onOpenVoiceModal}
                id="header-live-voice-btn"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Live Voice Tutor"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                <span className="hidden lg:inline">Voice</span>
              </button>
            )}
          </div>

          {/* Study Portal Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenStudyPortal) onOpenStudyPortal();
              else setShowCustomModal(true);
            }}
            disabled={isLoadingLesson}
            id="header-study-portal-btn"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Upload notes, PDF, or enter custom topic"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Reset Progress */}
          <button
            onClick={onResetConfidence}
            disabled={isLoadingLesson}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Reset progress"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Custom Topic Generator Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Generate Knowledge Graph Curriculum
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ARC deconstructs complex topics into structured prerequisite DAG graphs with targeted diagnostic assessments.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Subject or Topic of Study
                </label>
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="e.g. Quantum Computing, Thermodynamics, Dijkstra Graph Algorithms..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customTopicInput.trim() || isLoadingLesson}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingLesson ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Graph...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Curriculum</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
