"use client";

import React from "react";
import { GraduationCap, BookOpen, Atom, Lightbulb, Compass, ArrowRight } from "lucide-react";

interface WelcomeHeroProps {
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeHero({ onSelectPrompt }: WelcomeHeroProps) {
  const suggestions = [
    {
      title: "What is the Compton effect?",
      subtitle: "Formula, wavelength shift, and photon-electron collision",
      icon: Atom,
      tag: "Quantum Physics",
    },
    {
      title: "Explain the principle and construction of a Laser.",
      subtitle: "Stimulated emission, active medium, and optical resonator",
      icon: Lightbulb,
      tag: "Optics & Lasers",
    },
    {
      title: "What are the applications of optical fibres?",
      subtitle: "Total internal reflection, telecommunications, and sensors",
      icon: BookOpen,
      tag: "Fibre Optics",
    },
    {
      title: "Explain population inversion and pumping methods.",
      subtitle: "Metastable states, Boltzmann distribution, and energy levels",
      icon: Compass,
      tag: "Laser Physics",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center my-auto">
      {/* Tutor Icon Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
        <GraduationCap className="w-4 h-4" />
        <span>Personal Physics Tutor · SMS1001</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
        Learn Physics with Deep, Grounded Understanding.
      </h1>

      <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
        ReasonLens doesn&apos;t just give answers—it teaches concepts step-by-step from your verified course material (<span className="text-zinc-200 font-medium">SMS1001 Engineering Physics</span>).
      </p>

      {/* Suggested Topic Grid */}
      <div className="text-left">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-3 px-1">
          <span>Start with a core topic from your syllabus:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => onSelectPrompt(item.title)}
                className="group p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-850/80 transition-all text-left flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 group-hover:text-emerald-400 transition-colors">
                      {item.tag}
                    </span>
                    <Icon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-snug">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center gap-1 text-[11px] font-medium text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Ask tutor</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
