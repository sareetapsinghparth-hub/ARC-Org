"use client";

import React from "react";
import { BookOpen, FileCheck } from "lucide-react";
import { Source } from "./types";

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-5 pt-4 border-t border-zinc-800/80">
      <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold tracking-wider uppercase text-emerald-400/90">
        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Verified Course Material Sources</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((item, index) => {
          // Clean up document title for better student reading
          const cleanName = item.source
            .replace(/\.pdf$/i, "")
            .replace(/_/g, " ");

          return (
            <div
              key={`${item.source}-${item.page}-${index}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 text-xs text-zinc-300 transition-colors shadow-sm"
              title={`Grounding excerpt from page ${item.page} of ${item.source}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-medium text-zinc-200">{cleanName}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Page {item.page}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
