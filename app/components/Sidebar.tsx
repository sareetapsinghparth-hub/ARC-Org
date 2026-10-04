"use client";

import React, { useState } from "react";
import {
  Compass,
  Plus,
  MessageSquare,
  BookOpen,
  GraduationCap,
  X,
} from "lucide-react";
import { Conversation } from "./types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  backendHealthy?: boolean;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isOpen = true,
  onClose,
  backendHealthy = true,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"chats" | "materials" | "settings">("chats");

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black shadow-md shadow-emerald-950/40">
              <Compass className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">ReasonLens</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Tutor
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Personal AI Physics Tutor</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* New Session Action */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-850 text-sm font-medium text-white transition-all shadow-sm group"
          >
            <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Tutoring Session</span>
          </button>
        </div>

        {/* Section Navigation Pills */}
        <div className="px-3 pb-2 flex gap-1 border-b border-zinc-800/60 text-xs">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "chats"
                ? "bg-zinc-800/90 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Recent Chats
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "materials"
                ? "bg-zinc-800/90 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-zinc-800/90 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Status
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {activeTab === "chats" && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Recent Questions
              </div>
              <div className="space-y-1 mt-1">
                {conversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectConversation(c.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                      <span className="truncate flex-1">{c.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-4">
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Active Course</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Indexed</span>
                </div>
                <div className="mt-1 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-white">Engineering Physics</p>
                      <p className="text-[11px] text-zinc-400">Course Code: SMS1001</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Indexed Knowledge:</span>
                    <span className="text-emerald-400 font-medium">305 Vectors</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Verified Textbooks
                </div>
                <div className="mt-1 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate">SMS1001_Engineering Physics_2026.pdf</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-5">
                    Covers Lasers, Optical Fibres, Quantum Physics, Compton Effect & Photoelectric Effect.
                  </p>
                </div>
              </div>

              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Upcoming Subjects
                </div>
                <div className="mt-1 space-y-1.5 text-xs text-zinc-500">
                  <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-850 flex items-center justify-between">
                    <span>Quantum Mechanics</span>
                    <span className="text-[10px] text-zinc-600">Coming soon</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-850 flex items-center justify-between">
                    <span>Electromagnetic Theory</span>
                    <span className="text-[10px] text-zinc-600">Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-3">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                System Health & Security
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">FastAPI Backend:</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">FAISS Index:</span>
                  <span className="text-zinc-200 font-medium">305 vectors (384d)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">AI Model:</span>
                  <span className="text-zinc-200 font-medium">Gemini (Server-side)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Key Protection:</span>
                  <span className="text-emerald-400 font-medium">Never Exposed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info badge */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className="truncate">
              {backendHealthy ? "ReasonLens Backend Connected" : "Backend Disconnected"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
