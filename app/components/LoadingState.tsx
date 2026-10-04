"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, BookOpen, ImageIcon, Video } from "lucide-react";

interface LoadingStateProps {
  isImage?: boolean;
  isVideo?: boolean;
}

export function LoadingState({ isImage = false, isVideo = false }: LoadingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const textSteps = [
    "Consulting Engineering Physics (SMS1001) passages...",
    "Analyzing FAISS vector similarity & concepts...",
    "Formulating step-by-step tutor explanation...",
    "Grounding equations & citations with Gemini...",
  ];

  const imageSteps = [
    "Analyzing physics image equations, diagrams & symbols...",
    "Extracting core concepts & problem formulation...",
    "Retrieving grounded textbook passages from FAISS...",
    "Synthesizing step-by-step problem solution & citations...",
  ];

  const videoSteps = [
    "Validating video & sampling representative keyframes...",
    "Analyzing lecture demonstrations, formulas & timestamps...",
    "Querying FAISS vector index with extracted video topics...",
    "Grounding tutor explanations with SMS1001 textbook citations...",
    "Synthesizing timestamped tutor notes & concept checks...",
  ];

  const steps = isVideo ? videoSteps : isImage ? imageSteps : textSteps;

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex gap-3.5 max-w-3xl mr-auto py-3 w-full animate-fadeIn">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1 shadow-sm text-emerald-400 animate-pulse">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="font-semibold text-emerald-400">ReasonLens</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400/90 text-[10px] font-medium border border-emerald-500/20">
            AI Tutor
          </span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">
            {isVideo ? "Analyzing video lecture..." : isImage ? "Analyzing image..." : "Thinking..."}
          </span>
        </div>

        <div className="rounded-2xl rounded-tl-sm bg-zinc-900/60 border border-zinc-800/70 p-4.5 max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex space-x-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              {isVideo ? (
                <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : isImage ? (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="transition-all duration-300 italic">{steps[stepIndex]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

