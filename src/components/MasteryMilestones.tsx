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
  Flame,
  Star,
  Zap,
  ShieldCheck,
  PartyPopper,
  X,
  HelpCircle,
} from 'lucide-react';

interface MasteryMilestonesProps {
  concepts: Concept[];
  confidenceMap: Record<string, number | undefined>;
  latestEvaluatedConceptId?: string | null;
  latestScoreDelta?: number | null;
  onSelectConcept?: (conceptId: string) => void;
}

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
      const rawConf = confidenceMap[concept.id];
      const isAssessed = rawConf !== undefined && rawConf !== null;
      const confidence = isAssessed ? rawConf : 0;
      const isUnlocked = isAssessed && confidence >= 0.8;
      const percent = isAssessed ? Math.round(confidence * 100) : 0;
      const IconComponent = BADGE_ICONS[index % BADGE_ICONS.length];

      let honorTitle = 'Pending Diagnostic';
      if (!isAssessed) {
        honorTitle = 'Unassessed';
      } else if (percent >= 90) {
        honorTitle = 'Apex Savant';
      } else if (percent >= 80) {
        honorTitle = 'Concept Master';
      } else if (percent >= 65) {
        honorTitle = 'Adept Scholar';
      } else {
        honorTitle = 'Developing Learner';
      }

      return {
        concept,
        confidence,
        percent,
        isAssessed,
        isUnlocked,
        honorTitle,
        IconComponent,
        progressToUnlock: isAssessed ? Math.min(100, Math.round((confidence / 0.8) * 100)) : 0,
      };
    });
  }, [concepts, confidenceMap]);

  const unlockedCount = milestoneData.filter((m) => m.isUnlocked).length;
  const totalCount = milestoneData.length;
  const completionRate = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Detect if latest evaluation just unlocked an 80%+ badge
  useEffect(() => {
    if (latestEvaluatedConceptId) {
      const conf = confidenceMap[latestEvaluatedConceptId];
      const targetConcept = concepts.find((c) => c.id === latestEvaluatedConceptId);
      if (conf !== undefined && conf >= 0.8 && targetConcept && (latestScoreDelta ?? 0) > 0) {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Celebration Banner for New Milestone */}
      {celebratedBadge && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-indigo-50 to-emerald-50 border border-amber-300 rounded-xl p-4 shadow-sm animate-fadeIn flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-700 shadow-xs">
              <PartyPopper className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 font-mono">
                  ★ Milestone Unlocked!
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-300">
                  {Math.round(celebratedBadge.confidence * 100)}% Confidence
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                Mastered: {celebratedBadge.concept.name}
              </h4>
              <p className="text-xs text-slate-600">
                Outstanding reasoning! You have crossed the 80% mastery threshold. Prerequisite graph updated!
              </p>
            </div>
          </div>
          <button
            onClick={() => setCelebratedBadge(null)}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white rounded-lg border border-slate-200 transition-colors shrink-0 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Overall Mastery Level */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Mastery Milestones & Badges
              </h3>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                {unlockedCount} / {totalCount} Badges
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Earn mastery badges upon demonstrating 80%+ assessed mastery in each core concept
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-amber-800 border border-amber-300 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'unlocked'
                ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Unlocked ({unlockedCount})</span>
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'locked'
                ? 'bg-white text-indigo-800 border border-indigo-300 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Locked ({totalCount - unlockedCount})</span>
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-600">Total Curriculum Milestone Progress</span>
          <span className="font-bold text-amber-700">{completionRate}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-500 rounded-full shadow-xs"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMilestones.map((item) => {
          const { concept, percent, isAssessed, isUnlocked, honorTitle, IconComponent, progressToUnlock } = item;

          return (
            <div
              key={concept.id}
              onClick={() => onSelectConcept?.(concept.id)}
              className={`relative overflow-hidden p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isUnlocked
                  ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-300 hover:border-amber-400 hover:shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs opacity-90 hover:opacity-100'
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400'
                    : 'bg-slate-200'
                }`}
              />

              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border transition-transform duration-200 ${
                      isUnlocked
                        ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {concept.name}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isUnlocked ? 'text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {honorTitle}
                    </span>
                  </div>
                </div>

                {isUnlocked ? (
                  <span className="shrink-0 p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="shrink-0 p-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Confidence Metric */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Confidence:</span>
                  <span
                    className={`font-bold ${
                      !isAssessed
                        ? 'text-slate-400 font-sans'
                        : isUnlocked
                        ? 'text-emerald-700'
                        : percent >= 50
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {isAssessed ? `${percent}% ${isUnlocked ? '★' : ''}` : 'Unassessed'}
                  </span>
                </div>

                {/* Progress toward 80% */}
                {!isUnlocked ? (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full"
                        style={{ width: `${progressToUnlock}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{isAssessed ? `${80 - percent}% to Unlock` : 'Awaiting Diagnostic'}</span>
                      <span>Target: 80%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
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
