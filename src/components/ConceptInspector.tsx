import React from 'react';
import { Concept, PrerequisiteEdge, Question } from '../types';
import { X, Star, GitFork, ArrowRight, BookOpen, CheckCircle2, AlertCircle, Sparkles, Layers } from 'lucide-react';

interface ConceptInspectorProps {
  conceptId: string | null;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  questions: Question[];
  confidenceMap: Record<string, number>;
  onClose: () => void;
  onSelectAsTarget?: (conceptId: string) => void;
}

export function ConceptInspector({
  conceptId,
  concepts,
  prerequisites,
  questions,
  confidenceMap,
  onClose,
  onSelectAsTarget,
}: ConceptInspectorProps) {
  if (!conceptId) return null;

  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) return null;

  const conf = confidenceMap[concept.id] ?? concept.confidence ?? 0.5;
  const percentage = Math.round(conf * 100);

  // Incoming prerequisites (concepts that lead to this one)
  const incoming = prerequisites
    .filter((p) => p.target === concept.id)
    .map((p) => ({
      concept: concepts.find((c) => c.id === p.source),
      relation: p.relation,
    }))
    .filter((item) => item.concept !== undefined);

  // Outgoing dependents (concepts that this one unlocks)
  const outgoing = prerequisites
    .filter((p) => p.source === concept.id)
    .map((p) => ({
      concept: concepts.find((c) => c.id === p.target),
      relation: p.relation,
    }))
    .filter((item) => item.concept !== undefined);

  const relatedQuestions = questions.filter((q) => q.conceptId === concept.id);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl p-5 flex flex-col justify-between overflow-y-auto animate-slideLeft">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Concept Node
              </span>
              <h3 className="text-base font-bold text-slate-100 leading-snug">{concept.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confidence & Importance Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Mastery Confidence</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold font-mono ${
                  conf >= 0.7 ? 'text-emerald-400' : conf >= 0.4 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {percentage}%
              </span>
              <span className="text-xs text-slate-500 font-mono">c={conf.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Curriculum Importance</span>
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < concept.importance
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700 fill-slate-800'
                  }`}
                />
              ))}
              <span className="text-xs font-mono text-slate-300 ml-1">
                {concept.importance}/5
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Definition & Core Mechanics
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
            {concept.description}
          </p>
        </div>

        {/* Direct Prerequisites (Incoming) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-indigo-400 rotate-180" />
            Prerequisites Required ({incoming.length})
          </h4>
          {incoming.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
              Foundational Root Node: No prior dependencies in this curriculum.
            </p>
          ) : (
            <div className="space-y-2">
              {incoming.map(({ concept: pre, relation }) => {
                if (!pre) return null;
                const preConf = confidenceMap[pre.id] ?? pre.confidence ?? 0.5;
                return (
                  <div
                    key={pre.id}
                    className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-slate-200 block">{pre.name}</span>
                      {relation && <span className="text-[10px] text-slate-400">{relation}</span>}
                    </div>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                        preConf >= 0.7
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : preConf >= 0.4
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-300 border border-red-500/20'
                      }`}
                    >
                      {Math.round(preConf * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream Dependents (Outgoing) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            Unlocks Subsequent Concepts ({outgoing.length})
          </h4>
          {outgoing.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
              Terminal Curriculum Node: Culmination of this branch.
            </p>
          ) : (
            <div className="space-y-2">
              {outgoing.map(({ concept: dep, relation }) => {
                if (!dep) return null;
                return (
                  <div
                    key={dep.id}
                    className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-slate-200 block">{dep.name}</span>
                      {relation && <span className="text-[10px] text-slate-400">{relation}</span>}
                    </div>
                    <span className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded-full">
                      Dependent
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Questions Available */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Diagnostic Questions in Pool
          </h4>
          <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between">
            <span>{relatedQuestions.length} questions targeting this node</span>
            <span className="font-mono text-indigo-400 font-semibold">
              {relatedQuestions.filter((q) => q.difficulty === 'foundational').length} Foundational /{' '}
              {relatedQuestions.filter((q) => q.difficulty === 'intermediate').length} Inter /{' '}
              {relatedQuestions.filter((q) => q.difficulty === 'advanced').length} Adv
            </span>
          </div>
        </div>
      </div>

      {/* Footer action */}
      {onSelectAsTarget && (
        <div className="pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={() => {
              onSelectAsTarget(concept.id);
              onClose();
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Focus Adaptive Assessment on this Concept
          </button>
        </div>
      )}
    </div>
  );
}
