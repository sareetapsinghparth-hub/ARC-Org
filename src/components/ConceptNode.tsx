import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ConceptNodeData } from '../utils/graphLayout';
import { Target, AlertCircle, CheckCircle2, Star, Sparkles, HelpCircle, ShieldCheck } from 'lucide-react';
import { getStatusBadgeInfo } from '../utils/kGraphJudgment';

export const ConceptNode = memo(({ data }: NodeProps) => {
  if (!data || !(data as ConceptNodeData).concept) {
    return null;
  }
  const {
    concept,
    confidence,
    isAssessed,
    status,
    isVerifiedPrereq,
    isNextTarget,
    isSelected,
    viewMode = 'standard',
    onSelectConcept,
  } = data as ConceptNodeData;

  const badgeInfo = getStatusBadgeInfo(status);

  // Status icons and colors
  let StatusIcon = HelpCircle;
  let borderColor = 'border-slate-200 hover:border-slate-300';
  let barColor = 'bg-slate-300';
  let percentageText = 'Unassessed';

  if (!isAssessed) {
    StatusIcon = HelpCircle;
    borderColor = isNextTarget
      ? 'border-indigo-500 ring-2 ring-indigo-400 shadow-md'
      : 'border-slate-200 hover:border-slate-300';
    barColor = 'bg-slate-200';
    percentageText = 'Unassessed';
  } else if (status === 'prereq_verified') {
    StatusIcon = ShieldCheck;
    borderColor = isNextTarget
      ? 'border-teal-500 ring-2 ring-teal-400 shadow-md'
      : 'border-teal-300 hover:border-teal-400';
    barColor = 'bg-teal-500';
    percentageText = `${Math.round((confidence || 0.85) * 100)}%`;
  } else if (status === 'mastered') {
    StatusIcon = CheckCircle2;
    borderColor = isNextTarget
      ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-md'
      : 'border-emerald-300 hover:border-emerald-400';
    barColor = 'bg-emerald-500';
    percentageText = `${Math.round((confidence || 0.9) * 100)}%`;
  } else if (status === 'developing') {
    StatusIcon = Sparkles;
    borderColor = isNextTarget
      ? 'border-amber-400 ring-2 ring-amber-400 shadow-md'
      : 'border-amber-300 hover:border-amber-400';
    barColor = 'bg-amber-500';
    percentageText = `${Math.round((confidence || 0.6) * 100)}%`;
  } else {
    StatusIcon = AlertCircle;
    borderColor = isNextTarget
      ? 'border-rose-500 ring-2 ring-rose-400 shadow-md'
      : 'border-rose-300 hover:border-rose-400';
    barColor = 'bg-rose-500';
    percentageText = `${Math.round((confidence || 0.25) * 100)}%`;
  }

  const fillPercent = isAssessed ? Math.max(8, Math.min(100, Math.round((confidence || 0) * 100))) : 0;

  return (
    <div
      id={`node-${concept.id}`}
      onClick={() => onSelectConcept && onSelectConcept(concept.id)}
      className={`relative w-72 rounded-xl border-2 transition-all duration-200 cursor-pointer p-3.5 shadow-xs hover:shadow-md bg-white ${borderColor} ${
        isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : ''
      }`}
    >
      {/* Target indicator ribbon */}
      {isNextTarget && (
        <div className="absolute -top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
          <Target className="w-3 h-3" />
          Active Target
        </div>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white !-left-2 transition-transform hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3 !h-3 !bg-indigo-600 !border-2 !border-white !-right-2 transition-transform hover:!scale-125"
      />

      {/* Header with Title & Importance */}
      <div className="flex items-start justify-between gap-2 mb-1.5 mt-1">
        <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
          {concept.name}
        </h4>
        <div
          className="flex items-center gap-0.5 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200"
          title={`Importance: ${concept.importance}/5`}
        >
          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
          <span className="font-mono font-medium">{concept.importance}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-600 text-xs line-clamp-2 mb-3 leading-relaxed">
        {concept.description}
      </p>

      {/* Diagnostic Status & Confidence Bar */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-3.5 h-3.5 ${badgeInfo.textColor}`} />
            <span className={`text-[11px] font-sans font-medium ${badgeInfo.textColor}`}>
              {badgeInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`font-bold text-xs ${badgeInfo.textColor}`}>
              {percentageText}
            </span>
          </div>
        </div>

        {/* Visual Progress Track */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Concept Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
        <span className="font-mono">ID: {concept.id}</span>
        <span className={`px-2 py-0.5 rounded-full font-medium border ${badgeInfo.bgColor} ${badgeInfo.textColor} ${badgeInfo.borderColor}`}>
          {isAssessed ? `Score: ${Math.round((confidence || 0) * 100)}%` : 'Pending Diagnostic'}
        </span>
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
