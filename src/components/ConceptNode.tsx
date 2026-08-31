import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ConceptNodeData } from '../utils/graphLayout';
import { Sparkles, Target, AlertCircle, CheckCircle2, Star, Flame, Snowflake } from 'lucide-react';

export const ConceptNode = memo(({ data }: NodeProps) => {
  const { concept, confidence, isNextTarget, isSelected, viewMode = 'standard', onSelectConcept } = data as ConceptNodeData;

  const percentage = Math.round(confidence * 100);

  // Determine styling based on confidence thresholds and viewMode
  let statusTier: 'low' | 'medium' | 'high';
  let badgeColor: string;
  let borderColor: string;
  let bgGradient: string;
  let barColor: string;
  let textColor: string;
  let statusLabel: string;
  let StatusIcon = AlertCircle;

  if (viewMode === 'heatmap') {
    // Heatmap mode: Hot Red (Needs Attention) -> Warm Amber -> Cool Blue (Mastered)
    if (confidence < 0.4) {
      statusTier = 'low';
      borderColor = isNextTarget
        ? 'border-red-500 ring-2 ring-red-500/70 shadow-lg shadow-red-600/30'
        : 'border-red-500/80 hover:border-red-400 shadow-md shadow-red-950/40';
      bgGradient = 'bg-gradient-to-br from-red-950/90 via-slate-900/95 to-slate-950';
      badgeColor = 'bg-red-500/25 text-red-300 border border-red-500/40 font-bold';
      barColor = 'bg-gradient-to-r from-rose-600 to-red-500';
      textColor = 'text-red-300';
      statusLabel = 'Critical Focus 🔥';
      StatusIcon = Flame;
    } else if (confidence < 0.7) {
      statusTier = 'medium';
      borderColor = isNextTarget
        ? 'border-amber-400 ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/20'
        : 'border-amber-500/60 hover:border-amber-400';
      bgGradient = 'bg-gradient-to-br from-amber-950/50 via-slate-900/95 to-slate-950';
      badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
      barColor = 'bg-gradient-to-r from-amber-500 to-yellow-400';
      textColor = 'text-amber-300';
      statusLabel = 'Developing ⚡';
      StatusIcon = Sparkles;
    } else {
      statusTier = 'high';
      borderColor = isNextTarget
        ? 'border-cyan-400 ring-2 ring-cyan-500/70 shadow-lg shadow-cyan-500/30'
        : 'border-cyan-600/60 hover:border-cyan-400 shadow-md shadow-cyan-950/30';
      bgGradient = 'bg-gradient-to-br from-cyan-950/70 via-slate-900/95 to-slate-950';
      badgeColor = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
      barColor = 'bg-gradient-to-r from-blue-500 to-cyan-400';
      textColor = 'text-cyan-300';
      statusLabel = 'Mastered (Cool) ❄️';
      StatusIcon = Snowflake;
    }
  } else {
    // Standard Mode
    if (confidence < 0.4) {
      statusTier = 'low';
      borderColor = isNextTarget ? 'border-red-400 ring-2 ring-red-500/50 shadow-lg shadow-red-500/20' : 'border-red-600/70 hover:border-red-400';
      bgGradient = 'bg-slate-900/95';
      badgeColor = 'bg-red-500/20 text-red-400 border border-red-500/30';
      barColor = 'bg-red-500';
      textColor = 'text-red-300';
      statusLabel = 'Needs Review';
      StatusIcon = AlertCircle;
    } else if (confidence < 0.7) {
      statusTier = 'medium';
      borderColor = isNextTarget ? 'border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20' : 'border-amber-600/70 hover:border-amber-400';
      bgGradient = 'bg-slate-900/95';
      badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      barColor = 'bg-amber-400';
      textColor = 'text-amber-300';
      statusLabel = 'Developing';
      StatusIcon = Sparkles;
    } else {
      statusTier = 'high';
      borderColor = isNextTarget ? 'border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' : 'border-emerald-600/70 hover:border-emerald-400';
      bgGradient = 'bg-slate-900/95';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      barColor = 'bg-emerald-400';
      textColor = 'text-emerald-300';
      statusLabel = 'Mastered';
      StatusIcon = CheckCircle2;
    }
  }

  return (
    <div
      id={`node-${concept.id}`}
      onClick={() => onSelectConcept && onSelectConcept(concept.id)}
      className={`relative w-72 rounded-xl border-2 transition-all duration-200 cursor-pointer p-3.5 backdrop-blur-md ${bgGradient} ${borderColor} ${
        isSelected ? 'ring-2 ring-indigo-400 shadow-xl' : ''
      }`}
    >
      {/* Target indicator ribbon */}
      {isNextTarget && (
        <div className="absolute -top-3 left-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
          <Target className="w-3 h-3" />
          Active Target
        </div>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 !-left-2 transition-transform hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 !-right-2 transition-transform hover:!scale-125"
      />

      {/* Header with Title & Importance */}
      <div className="flex items-start justify-between gap-2 mb-1.5 mt-1">
        <h4 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2">
          {concept.name}
        </h4>
        <div className="flex items-center gap-0.5 shrink-0 bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] text-amber-400 border border-slate-700/60" title={`Importance: ${concept.importance}/5`}>
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="font-mono font-medium">{concept.importance}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs line-clamp-2 mb-3 leading-relaxed">
        {concept.description}
      </p>

      {/* Confidence Bar & Percentage Display */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-3.5 h-3.5 ${textColor}`} />
            <span className="text-slate-400 text-[11px]">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">Confidence:</span>
            <span className={`font-bold text-xs ${textColor}`}>
              {percentage}%
            </span>
          </div>
        </div>

        {/* Visual Progress Track */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${Math.max(4, Math.min(100, percentage))}%` }}
          />
        </div>
      </div>

      {/* Quick confidence tier badge footer */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono text-slate-500">ID: {concept.id}</span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
          c = {confidence.toFixed(2)}
        </span>
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
