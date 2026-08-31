import React, { useState, useMemo, useEffect } from 'react';
import { Concept } from '../types';
import {
  Award,
  Trophy,
  Medal,
  Crown,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  Flame,
  Star,
  Zap,
  ShieldCheck,
  PartyPopper,
  X,
} from 'lucide-react';

interface MasteryMilestonesProps {
  concepts: Concept[];
  confidenceMap: Record<string, number>;
  latestEvaluatedConceptId?: string | null;
  latestScoreDelta?: number | null;
  onSelectConcept?: (conceptId: string) => void;
}

// Creative badge icons and honors per concept
const BADGE_ICONS = [Award, Trophy, Crown, Medal, ShieldCheck, Zap, Star, Flame];

export function MasteryMilestones({
  concepts,
  confidenceMap,
  latestEvaluatedConceptId,
  latestScoreDelta,
  onSelectConcept,
}: MasteryMilestonesProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [celebratedBadge, setCelebratedBadge] = useState<{
    concept: Concept;
    confidence: number;
  } | null>(null);

  // Compute milestones
  const milestoneData = useMemo(() => {
    return concepts.map((concept, index) => {
      const confidence = confidenceMap[concept.id] ?? concept.confidence ?? 0.5;
      const isUnlocked = confidence >= 0.8;
      const percent = Math.round(confidence * 100);
      const IconComponent = BADGE_ICONS[index % BADGE_ICONS.length];

      // Custom mastery title based on index or concept name
      let honorTitle = 'Mastery Virtuoso';
      if (percent >= 90) honorTitle = 'Apex Savant';
      else if (percent >= 80) honorTitle = 'Concept Master';
      else if (percent >= 65) honorTitle = 'Adept Scholar';
      else honorTitle = 'Novice Apprentice';

      return {
        concept,
        confidence,
        percent,
        isUnlocked,
        honorTitle,
        IconComponent,
        progressToUnlock: Math.min(100, Math.round((confidence / 0.8) * 100)),
      };
    });
  }, [concepts, confidenceMap]);

  const unlockedCount = milestoneData.filter((m) => m.isUnlocked).length;
  const totalCount = milestoneData.length;
  const completionRate = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Detect if latest evaluation just unlocked an 80%+ badge
  useEffect(() => {
    if (latestEvaluatedConceptId) {
      const conf = confidenceMap[latestEvaluatedConceptId] ?? 0;
      const targetConcept = concepts.find((c) => c.id === latestEvaluatedConceptId);
      if (conf >= 0.8 && targetConcept && (latestScoreDelta ?? 0) > 0) {
        setCelebratedBadge({
          concept: targetConcept,
          confidence: conf,
        });
      }
    }
  }, [latestEvaluatedConceptId, confidenceMap, latestScoreDelta, concepts]);

  // Filtered list
  const filteredMilestones = useMemo(() => {
    if (filter === 'unlocked') return milestoneData.filter((m) => m.isUnlocked);
    if (filter === 'locked') return milestoneData.filter((m) => !m.isUnlocked);
    return milestoneData;
  }, [milestoneData, filter]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Celebration Banner for New Milestone */}
      {celebratedBadge && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-indigo-500/25 to-emerald-500/20 border border-amber-500/40 rounded-xl p-4 shadow-lg animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 shadow-inner">
              <PartyPopper className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                  ★ Milestone Unlocked!
                </span>
                <span className="bg-amber-400/20 text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  {Math.round(celebratedBadge.confidence * 100)}% Confidence
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                Mastered: {celebratedBadge.concept.name}
              </h4>
              <p className="text-xs text-slate-300">
                Outstanding reasoning! You have crossed the 80% mastery threshold. Keep up the brilliant momentum!
              </p>
            </div>
          </div>
          <button
            onClick={() => setCelebratedBadge(null)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950/60 rounded-lg border border-slate-800 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Overall Mastery Level */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                Mastery Milestones & Badges
              </h3>
              <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                {unlockedCount} / {totalCount} Badges
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Earn distinctive mastery badges upon reaching 80%+ confidence in each core concept
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'unlocked'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Unlocked ({unlockedCount})</span>
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'locked'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>In Progress ({totalCount - unlockedCount})</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Ribbon */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Curriculum Mastery Progress</span>
          </span>
          <span className="font-mono font-bold text-amber-300">
            {completionRate}% Completed
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500 rounded-full shadow-sm"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMilestones.map((item) => {
          const { concept, percent, isUnlocked, honorTitle, IconComponent, progressToUnlock } = item;

          return (
            <div
              key={concept.id}
              onClick={() => onSelectConcept?.(concept.id)}
              className={`relative overflow-hidden p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isUnlocked
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-950 border-amber-500/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Top Accent Stripe */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400'
                    : 'bg-slate-800'
                }`}
              />

              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border transition-transform duration-200 ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-amber-400/20 to-yellow-500/20 text-amber-300 border-amber-400/40 shadow-inner'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                        {concept.name}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isUnlocked ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {honorTitle}
                    </span>
                  </div>
                </div>

                {isUnlocked ? (
                  <span className="shrink-0 p-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="shrink-0 p-1 bg-slate-900 text-slate-500 border border-slate-800 rounded-lg">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Confidence Metric & Positive Reinforcement */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Confidence:</span>
                  <span
                    className={`font-bold ${
                      isUnlocked
                        ? 'text-emerald-400'
                        : percent >= 50
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {percent}% {isUnlocked && '★'}
                  </span>
                </div>

                {/* Progress toward 80% */}
                {!isUnlocked ? (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full"
                        style={{ width: `${progressToUnlock}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{80 - percent}% to Unlock</span>
                      <span>Target: 80%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-300/90 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>80%+ Mastery Achieved! Excellent depth.</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
