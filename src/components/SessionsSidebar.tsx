import React, { useState } from 'react';
import { SavedLearningSession } from '../types';
import {
  Plus,
  MessageSquare,
  Globe,
  FileText,
  BookOpen,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';

interface SessionsSidebarProps {
  sessions: SavedLearningSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectSession: (session: SavedLearningSession) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions?: () => void;
}

export function SessionsSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onToggleOpen,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAllSessions,
}: SessionsSidebarProps) {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.topic.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 2) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getSourceIcon = (sourceType: SavedLearningSession['sourceType']) => {
    switch (sourceType) {
      case 'web-search':
        return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'pdf':
      case 'custom-text':
        return <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'preset':
      default:
        return <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    }
  };

  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-4 px-2 bg-white border-r border-slate-200 z-20 shrink-0 w-14 transition-all">
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Expand Learning History"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="mt-4 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
          title="New Topic Session"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="mt-auto flex flex-col items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full bg-emerald-500"
            title="Model Online • Google Search Grounded"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-30 md:hidden"
        onClick={onToggleOpen}
      />

      {/* Main Persistent Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 md:static flex flex-col w-72 lg:w-80 bg-slate-50/90 border-r border-slate-200/90 shadow-lg md:shadow-none h-full transition-all shrink-0">
        {/* Top Header */}
        <div className="p-3.5 border-b border-slate-200 bg-white/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              ARC
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sessions & Topics
              </h2>
              <p className="text-[10px] text-slate-500">Prerequisite learning history</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Collapse History Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Session Button */}
        <div className="p-3 bg-white/40 border-b border-slate-200">
          <button
            type="button"
            onClick={onNewSession}
            id="start-new-topic-btn"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>New Topic / Search</span>
          </button>
        </div>

        {/* Search filter if more than 3 sessions */}
        {sessions.length > 3 && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search past sessions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Recent Sessions ({filteredSessions.length})</span>
            {sessions.length > 0 && onClearAllSessions && (
              <button
                type="button"
                onClick={onClearAllSessions}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-normal cursor-pointer"
                title="Clear all saved sessions"
              >
                Clear all
              </button>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto opacity-40 text-slate-400" />
              <p>No learning sessions yet.</p>
              <p className="text-[11px] text-slate-400">
                Search the web or upload materials to start!
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const hasMastery = session.masteredCount > 0;

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-white border-indigo-300 text-indigo-950 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-700'
                  }`}
                  onClick={() => onSelectSession(session)}
                >
                  <div className="mt-0.5">{getSourceIcon(session.sourceType)}</div>

                  <div className="flex-1 min-w-0 pr-4">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-indigo-900' : 'text-slate-800'
                      }`}
                    >
                      {session.topic}
                    </h3>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimestamp(session.lastActiveAt || session.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{session.totalConcepts} nodes</span>
                      {hasMastery && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {session.masteredCount} mastered
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete session button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer absolute right-2 top-2.5"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Live Engine Status */}
        <div className="p-3 border-t border-slate-200 bg-white/70 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-600">
                Connected to Web
              </span>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
              Gemini 3.8
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
