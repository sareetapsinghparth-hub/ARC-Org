import React from 'react';
import { Concept, PrerequisiteEdge, Question } from '../types';
import { X, Star, GitFork, ArrowRight, BookOpen, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { getConceptStatus, getStatusBadgeInfo } from '../utils/kGraphJudgment';

interface ConceptInspectorProps {
  conceptId: string | null;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  questions: Question[];
  confidenceMap: Record<string, number | undefined>;
  verifiedPrereqMap?: Record<string, boolean>;
  onClose: () => void;
  onSelectAsTarget?: (conceptId: string) => void;
}

export function ConceptInspector({
  conceptId,
  concepts,
  prerequisites,
  questions,
  confidenceMap,
  verifiedPrereqMap = {},
  onClose,
  onSelectAsTarget,
}: ConceptInspectorProps) {
  if (!conceptId) return null;

  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) return null;

  const rawConf = confidenceMap[concept.id];
  const isAssessed = rawConf !== undefined && rawConf !== null;
  const isVerified = Boolean(verifiedPrereqMap[concept.id]);
  const status = getConceptStatus(rawConf, isVerified);
  const badgeInfo = getStatusBadgeInfo(status);

  // Incoming prerequisites (concepts that lead to this one)
  const incoming = (prerequisites || [])
    .filter((p) => p.target === concept.id)
    .map((p) => ({
      concept: concepts.find((c) => c.id === p.source),
      relation: p.relation,
    }))
    .filter((item) => item.concept !== undefined);

  // Outgoing dependents (concepts that this one unlocks)
  const outgoing = (prerequisites || [])
    .filter((p) => p.source === concept.id)
    .map((p) => ({
      concept: concepts.find((c) => c.id === p.target),
      relation: p.relation,
    }))
    .filter((item) => item.concept !== undefined);

  const relatedQuestions = (questions || []).filter((q) => q.conceptId === concept.id);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-slideLeft">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                K-Graph Concept Node
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{concept.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Status & Importance Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block mb-1">Diagnostic Status</span>
            <div className="space-y-1">
              <span className={`text-base font-bold font-mono ${badgeInfo.textColor}`}>
                {isAssessed ? `${Math.round((rawConf || 0) * 100)}%` : 'Unassessed'}
              </span>
              <div className="text-[11px] font-medium text-slate-600">
                {badgeInfo.label}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block mb-1">Curriculum Importance</span>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < concept.importance
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-slate-300 fill-slate-200'
                  }`}
                />
              ))}
              <span className="text-xs font-mono text-slate-700 ml-1">
                {concept.importance}/5
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Definition & Core Mechanics
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
            {concept.description}
          </p>
        </div>

        {/* Direct Prerequisites (Incoming) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-indigo-600 rotate-180" />
            Prerequisites Required ({incoming.length})
          </h4>
          {incoming.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Foundational Root Node: No prior dependencies in this curriculum.
            </p>
          ) : (
            <div className="space-y-2">
              {incoming.map(({ concept: pre, relation }) => {
                if (!pre) return null;
                const preConf = confidenceMap[pre.id];
                const isPreAssessed = preConf !== undefined && preConf !== null;
                const preStatus = getConceptStatus(preConf, Boolean(verifiedPrereqMap[pre.id]));
                const preBadge = getStatusBadgeInfo(preStatus);

                return (
                  <div
                    key={pre.id}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-slate-900 block">{pre.name}</span>
                      {relation && <span className="text-[10px] text-slate-500">{relation}</span>}
                    </div>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold border ${preBadge.bgColor} ${preBadge.textColor} ${preBadge.borderColor}`}
                    >
                      {isPreAssessed ? `${Math.round((preConf || 0) * 100)}%` : 'Unassessed'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream Dependents (Outgoing) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            Unlocks Subsequent Concepts ({outgoing.length})
          </h4>
          {outgoing.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Terminal Curriculum Node: Culmination of this branch.
            </p>
          ) : (
            <div className="space-y-2">
              {outgoing.map(({ concept: dep, relation }) => {
                if (!dep) return null;
                return (
                  <div
                    key={dep.id}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-slate-900 block">{dep.name}</span>
                      {relation && <span className="text-[10px] text-slate-500">{relation}</span>}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">ID: {dep.id}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Questions Available */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Diagnostic Questions in Pool ({relatedQuestions.length})
          </h4>
          <p className="text-xs text-slate-600">
            {relatedQuestions.length > 0
              ? `${relatedQuestions.length} curated questions available across foundational to advanced tiers.`
              : 'No dedicated question items yet.'}
          </p>
        </div>
      </div>

      {/* Target Action Button */}
      {onSelectAsTarget && (
        <div className="pt-4 border-t border-slate-200 mt-4">
          <button
            onClick={() => onSelectAsTarget(concept.id)}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Target This Concept in Adaptive Engine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
