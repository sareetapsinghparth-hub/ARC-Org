import React, { useState, useMemo } from 'react';
import { AssessmentHistoryItem, Concept } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  LineChart as ChartIcon,
  ListOrdered,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AssessmentHistoryProps {
  history: AssessmentHistoryItem[];
  concepts?: Concept[];
}

const CONCEPT_PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

export function AssessmentHistory({ history, concepts = [] }: AssessmentHistoryProps) {
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'chart' | 'timeline'>('chart');

  // Unique concept list from history and provided concepts
  const availableConcepts = useMemo(() => {
    const conceptMap = new Map<string, string>();
    // First from curriculum concepts
    concepts.forEach((c) => conceptMap.set(c.id, c.name));
    // Then from history items
    history.forEach((h) => conceptMap.set(h.question.conceptId, h.question.conceptName));
    return Array.from(conceptMap.entries()).map(([id, name]) => ({ id, name }));
  }, [concepts, history]);

  // Concepts actually evaluated in this history
  const evaluatedConceptIds = useMemo(() => {
    const ids = new Set<string>();
    history.forEach((h) => ids.add(h.question.conceptId));
    return Array.from(ids);
  }, [history]);

  // Assign deterministic color for each concept
  const conceptColors = useMemo(() => {
    const map: Record<string, string> = {};
    availableConcepts.forEach((c, idx) => {
      map[c.id] = CONCEPT_PALETTE[idx % CONCEPT_PALETTE.length];
    });
    return map;
  }, [availableConcepts]);

  // Prepare chart data: Progression over assessment steps (1..N)
  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    // Track running confidence for each concept as history unfolds
    const runningConceptConfidence: Record<string, number> = {};

    // Initial baseline (e.g. 50% or initial from history)
    const initialPoint: any = {
      step: 'Start',
      stepNum: 0,
      timestamp: history[0].timestamp - 1000,
      overallAverage: 50,
      evaluatedConcept: null,
    };
    availableConcepts.forEach((c) => {
      // Look for first previousConfidence in history or default to 50
      const firstMention = history.find((h) => h.question.conceptId === c.id);
      const startConf = firstMention ? firstMention.previousConfidence : 0.5;
      runningConceptConfidence[c.id] = Math.round(startConf * 100);
      initialPoint[c.name] = runningConceptConfidence[c.id];
      initialPoint[`${c.id}_conf`] = runningConceptConfidence[c.id];
    });

    const data = [initialPoint];

    history.forEach((item, index) => {
      const stepLabel = `Q${index + 1}`;
      const cId = item.question.conceptId;
      const cName = item.question.conceptName;
      const newConfPercent = Math.round(item.newConfidence * 100);

      // Update running confidence for this concept
      runningConceptConfidence[cId] = newConfPercent;

      // Calculate running overall average across all known concepts
      const activeValues = Object.values(runningConceptConfidence);
      const overallAvg =
        activeValues.length > 0
          ? Math.round(activeValues.reduce((a, b) => a + b, 0) / activeValues.length)
          : newConfPercent;

      const point: any = {
        step: stepLabel,
        stepNum: index + 1,
        conceptId: cId,
        conceptName: cName,
        score: Math.round(item.result.score * 100),
        delta: item.result.confidenceDelta || 0,
        status: item.result.status,
        timestamp: item.timestamp,
        prompt: item.question.prompt,
        overallAverage: overallAvg,
        currentConfidence: newConfPercent,
        previousConfidence: Math.round(item.previousConfidence * 100),
      };

      // Set current confidence for all concepts so lines can render continuously
      availableConcepts.forEach((c) => {
        point[c.name] = runningConceptConfidence[c.id] ?? 50;
        point[`${c.id}_conf`] = runningConceptConfidence[c.id] ?? 50;
      });

      data.push(point);
    });

    return data;
  }, [history, availableConcepts]);

  if (history.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-2">
        <ChartIcon className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
        <p className="font-medium text-slate-400">Diagnostic Session Timeline & Trend Chart</p>
        <p className="text-slate-500 max-w-sm mx-auto">
          No completed assessments in this session yet. Answer questions to record your learning timeline and track confidence score trends.
        </p>
      </div>
    );
  }

  // Determine active lines to show
  const filteredConcepts =
    selectedConceptFilter === 'all'
      ? availableConcepts.filter((c) => evaluatedConceptIds.includes(c.id))
      : availableConcepts.filter((c) => c.id === selectedConceptFilter);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ChartIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200">
                Confidence Progression & Timeline
              </h3>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                {history.length} {history.length === 1 ? 'Assessment' : 'Assessments'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualizing adaptive mastery and confidence shifts over session queries
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'chart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>Trend Chart</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Timeline Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (for Trend Chart) */}
      {activeTab === 'chart' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-300">Filter Concept:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedConceptFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border cursor-pointer ${
                selectedConceptFilter === 'all'
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-500/60 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              All Concepts ({evaluatedConceptIds.length})
            </button>

            {availableConcepts
              .filter((c) => evaluatedConceptIds.includes(c.id))
              .map((c) => {
                const color = conceptColors[c.id];
                const isSelected = selectedConceptFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConceptFilter(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-600 font-bold shadow-sm'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate max-w-[120px]">{c.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Trend Chart Content */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          <div className="h-64 sm:h-72 w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 sm:p-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

                <XAxis
                  dataKey="step"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />

                <YAxis
                  domain={[0, 100]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  ticks={[0, 25, 50, 75, 100]}
                />

                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  y={70}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: 'Mastery (70%)',
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: '11px',
                    paddingBottom: '8px',
                  }}
                />

                {/* Overall Session Average Line */}
                {selectedConceptFilter === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="overallAverage"
                    name="Overall Average"
                    stroke="#e2e8f0"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#e2e8f0' }}
                    activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2 }}
                  />
                )}

                {/* Individual Concept Lines */}
                {filteredConcepts.map((concept) => {
                  const color = conceptColors[concept.id] || '#6366f1';
                  return (
                    <Line
                      key={concept.id}
                      type="monotone"
                      dataKey={concept.name}
                      name={concept.name}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: color, stroke: '#0f172a', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Green dashed line indicates the 70% Mastery threshold</span>
            </span>
            <span className="font-mono text-slate-500">
              X: Assessment Step • Y: Confidence Score
            </span>
          </div>
        </div>
      )}

      {/* Timeline Log Content */}
      {activeTab === 'timeline' && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {history
            .slice()
            .reverse()
            .map((item, idx) => {
              const delta = item.result.confidenceDelta || 0;
              const color = conceptColors[item.question.conceptId] || '#6366f1';
              return (
                <div
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-slate-200 truncate">
                      {item.result.status === 'correct' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : item.result.status === 'partly correct' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate font-semibold">{item.question.conceptName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      {item.imageAttached && (
                        <span className="flex items-center gap-1 text-indigo-400 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-800/40">
                          <ImageIcon className="w-3 h-3" />
                          Vision
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded ${
                          delta >= 0
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
                            : 'text-rose-400 bg-rose-950/40 border border-rose-800/50'
                        }`}
                      >
                        {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {delta > 0 ? '+' : ''}
                        {Math.round(delta * 100)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800/70 font-mono line-clamp-2">
                    "{item.question.prompt}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-slate-300">Grade:</span>{' '}
                      {Math.round(item.result.score * 100)}%
                    </span>
                    <span className="font-mono">
                      Confidence:{' '}
                      <span className="text-slate-400">
                        {Math.round(item.previousConfidence * 100)}%
                      </span>{' '}
                      →{' '}
                      <span
                        className={`font-bold ${
                          item.newConfidence >= 0.7
                            ? 'text-emerald-400'
                            : item.newConfidence < 0.4
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {Math.round(item.newConfidence * 100)}%
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

/**
 * Custom Tooltip for Recharts Confidence Line Chart
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const isStart = dataPoint.stepNum === 0;

  return (
    <div className="bg-slate-900/95 border border-slate-700 shadow-2xl rounded-xl p-3 text-xs max-w-xs backdrop-blur-md space-y-2 z-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span className="font-bold text-indigo-300 font-mono">
          {isStart ? 'Initial Baseline' : `Assessment ${dataPoint.step}`}
        </span>
        {!isStart && dataPoint.status && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
              dataPoint.status === 'correct'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : dataPoint.status === 'partly correct'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {dataPoint.status}
          </span>
        )}
      </div>

      {!isStart && dataPoint.conceptName && (
        <div>
          <div className="text-[11px] font-semibold text-slate-200 truncate">
            {dataPoint.conceptName}
          </div>
          {dataPoint.prompt && (
            <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">
              "{dataPoint.prompt}"
            </p>
          )}
        </div>
      )}

      <div className="space-y-1 pt-1 text-[11px] font-mono">
        {payload.map((entry: any, index: number) => {
          const val = entry.value;
          return (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[150px]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.name}:</span>
              </span>
              <span className="font-bold text-white shrink-0">{val}%</span>
            </div>
          );
        })}
      </div>

      {!isStart && dataPoint.delta !== undefined && (
        <div className="pt-1.5 border-t border-slate-800 text-[10px] flex items-center justify-between">
          <span className="text-slate-400">Step Delta:</span>
          <span
            className={`font-mono font-bold ${
              dataPoint.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {dataPoint.delta >= 0 ? '+' : ''}
            {Math.round(dataPoint.delta * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
