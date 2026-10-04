"use client";

import React from "react";
import { Menu, Compass, BookOpen } from "lucide-react";

interface TutorHeaderProps {
  onToggleSidebar: () => void;
  backendHealthy: boolean;
}

export function TutorHeader({ onToggleSidebar, backendHealthy }: TutorHeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">ReasonLens</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            AI Tutor
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Active Textbook Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>SMS1001 Engineering Physics</span>
        </div>

        {/* Backend Connectivity Status */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
          title={backendHealthy ? "Connected to FastAPI (127.0.0.1:8000)" : "Cannot reach FastAPI backend"}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            }`}
          />
          <span className="text-[11px] font-medium hidden md:inline">
            {backendHealthy ? "RAG Server Active" : "Backend Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
