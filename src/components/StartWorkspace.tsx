import React, { useState, useRef } from 'react';
import {
  Search,
  Globe,
  Upload,
  FileText,
  GitFork,
  Sparkles,
  ArrowRight,
  BookOpen,
  Mic,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Loader2,
} from 'lucide-react';
import { DEFAULT_CURRICULA } from '../data/defaultCurricula';

interface StartWorkspaceProps {
  isLoading: boolean;
  onSearchWeb: (query: string) => void;
  onUploadFile: (file: File) => void;
  onSelectPreset: (presetKey: string) => void;
  onOpenGraphSidebar: () => void;
  onOpenStudyPortal: () => void;
  onOpenVoiceModal: () => void;
  onOpenChatModal: () => void;
}

const POPULAR_SEARCHES = [
  'Multivariable Calculus: Stokes’ Theorem',
  'Quantum Computing: Qubits & Teleportation',
  'Deep Learning: Transformer Attention Mechanics',
  'Linear Algebra: Eigenvalues & PCA',
  'CRISPR-Cas9 & Gene Editing Pathways',
];

export function StartWorkspace({
  isLoading,
  onSearchWeb,
  onUploadFile,
  onSelectPreset,
  onOpenGraphSidebar,
  onOpenStudyPortal,
  onOpenVoiceModal,
  onOpenChatModal,
}: StartWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;
    onSearchWeb(searchQuery.trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-full flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Title & Introduction */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>ARC Adaptive Reasoning Model</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          What would you like to master today?
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Search any subject on the web or upload materials. ARC connects with live web search to
          synthesize a prerequisite knowledge graph and calibrate your understanding.
        </p>
      </div>

      {/* Web Search Grounding Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Connected to Google Web Search</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[11px] text-slate-400">Live search grounded</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any topic or concept on the web (e.g., Fourier Transform, Quantum Gates)..."
                disabled={isLoading}
                id="web-search-input"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              id="search-web-btn"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Search Web</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Popular Web Searches */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Suggestions:</span>
          {POPULAR_SEARCHES.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => {
                setSearchQuery(query);
                onSearchWeb(query);
              }}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Options Grid: Upload & K-Graph Sidebar Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Materials Card */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-5 text-left flex flex-col justify-between group cursor-pointer transition-all hover:shadow-xs"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Upload Study Materials
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload textbook chapters, lecture slides, syllabus, or handwritten math notes (PDF,
                PNG, JPG).
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Browse files or drop here</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Option: Explore K-Graph in Dedicated Sidebar */}
        <div
          onClick={onOpenGraphSidebar}
          className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 text-left flex flex-col justify-between group cursor-pointer transition-all hover:shadow-xs"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Prerequisite Knowledge Graph
                </h2>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                  Dedicated Sidebar
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Open the dedicated K-Graph sidebar to explore directed prerequisite DAGs and
                diagnostic heatmaps without congesting the page.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Open K-Graph Sidebar</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Preset Curricula Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Or Choose a Curated Foundation Pathway</span>
          </h2>
          <button
            type="button"
            onClick={onOpenStudyPortal}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            Custom Ingestion Portal →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(DEFAULT_CURRICULA).map(([key, curriculum]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectPreset(key)}
              disabled={isLoading}
              className="bg-white border border-slate-200 hover:border-indigo-300 p-3.5 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer"
            >
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                {curriculum.topic}
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                {curriculum.overview}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{curriculum.concepts.length} concepts</span>
                <span className="text-indigo-600 font-sans font-medium group-hover:underline">
                  Start →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Multimodal Quick Access: Voice Tutor & AI Assistant */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 pt-2">
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
        >
          <Mic className="w-3.5 h-3.5 text-indigo-500" />
          <span>Live Gemini Voice Tutor</span>
        </button>

        <button
          type="button"
          onClick={onOpenChatModal}
          className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>AI Socratic Study Drawer</span>
        </button>
      </div>
    </div>
  );
}
