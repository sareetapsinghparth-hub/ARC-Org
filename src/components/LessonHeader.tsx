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
} from 'lucide-react';

interface LessonHeaderProps {
  currentLesson: LessonData;
  confidenceMap: Record<string, number>;
  isLoadingLesson: boolean;
  onSelectPreset: (key: string) => void;
  onGenerateCustomLesson: (topic: string) => void;
  onResetConfidence: () => void;
  onOpenVoiceModal?: () => void;
  onToggleGraphSidebar?: () => void;
  isGraphSidebarOpen?: boolean;
}

export function LessonHeader({
  currentLesson,
  confidenceMap,
  isLoadingLesson,
  onSelectPreset,
  onGenerateCustomLesson,
  onResetConfidence,
  onOpenVoiceModal,
  onToggleGraphSidebar,
  isGraphSidebarOpen = false,
}: LessonHeaderProps) {
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Compute aggregate statistics
  const concepts = currentLesson.concepts || [];
  const totalConcepts = concepts.length;
  const confidences = concepts.map((c) => confidenceMap[c.id] ?? c.confidence ?? 0.5);
  const avgConfidence =
    totalConcepts > 0
      ? Math.round((confidences.reduce((acc, v) => acc + v, 0) / totalConcepts) * 100)
      : 50;
  const masteredCount = confidences.filter((c) => c >= 0.7).length;
  const reviewCount = confidences.filter((c) => c < 0.4).length;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopicInput.trim() || isLoadingLesson) return;
    onGenerateCustomLesson(customTopicInput.trim());
    setShowCustomModal(false);
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-4 sm:px-6 py-3.5 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Topic Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ARC
              </h1>
              <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium">
                Adaptive Reasoning Model
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-sm sm:max-w-md">
              {currentLesson.topic}
            </p>
          </div>
        </div>

        {/* Aggregate Mastery Stats */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">Knowledge Mastery:</span>
              <span
                className={`font-mono font-bold ${
                  avgConfidence >= 70
                    ? 'text-emerald-400'
                    : avgConfidence >= 40
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {avgConfidence}%
              </span>
            </div>
            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  avgConfidence >= 70
                    ? 'bg-emerald-400'
                    : avgConfidence >= 40
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                }`}
                style={{ width: `${avgConfidence}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
            <span
              className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-2 py-1 rounded-lg flex items-center gap-1"
              title="Concepts Mastered"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {masteredCount}/{totalConcepts}
            </span>
            {reviewCount > 0 && (
              <span
                className="bg-red-950/40 border border-red-800/40 text-red-300 px-2 py-1 rounded-lg flex items-center gap-1"
                title="Concepts Requiring Intervention"
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                {reviewCount} gap{reviewCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Controls: Preset Switcher, Knowledge Graph Sidebar, Voice Tutor & Custom Generator */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Select curriculum preset"
              onChange={(e) => onSelectPreset(e.target.value)}
              disabled={isLoadingLesson}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="calculus-derivatives">Calculus: Derivatives & Chain Rule</option>
              <option value="neural-networks">Machine Learning: Neural Networks</option>
            </select>

            {onToggleGraphSidebar && (
              <button
                type="button"
                onClick={onToggleGraphSidebar}
                id="header-graph-toggle-btn"
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isGraphSidebarOpen
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30'
                }`}
                title="Toggle Knowledge Graph Sidebar"
              >
                <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Knowledge Graph</span>
                <span className="sm:hidden">Graph</span>
              </button>
            )}

            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={onOpenVoiceModal}
                id="header-live-voice-btn"
                className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Start Real-time Voice Conversation with Gemini Live API (gemini-3.1-flash-live-preview)"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Tutor</span>
                <span className="sm:hidden">Live</span>
              </button>
            )}

            <button
              onClick={() => setShowCustomModal(true)}
              disabled={isLoadingLesson}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Generate new adaptive curriculum with NVIDIA Ultra 550b"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Topic</span>
            </button>

            <button
              onClick={onResetConfidence}
              disabled={isLoadingLesson}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
              title="Reset all confidence values to initial 0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Topic Generator Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">
                Generate Knowledge Graph Curriculum
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              ARC uses <strong className="text-slate-200">NVIDIA Nemotron 3 Ultra 550b</strong> to deconstruct any complex topic into a prerequisite DAG graph with tailored diagnostic assessments.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Subject or Topic of Study
                </label>
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="e.g. Quantum Computing, Thermodynamics, Dijkstra Graph Algorithms..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customTopicInput.trim() || isLoadingLesson}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
