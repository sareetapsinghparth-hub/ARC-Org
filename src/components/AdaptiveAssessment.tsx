import React, { useState } from 'react';
import {
  Question,
  Concept,
  AnswerAnalysisResult,
  SelectedImageInfo,
  AdaptiveSelectionMeta,
  SessionPacing,
} from '../types';
import { ImageUpload } from './ImageUpload';
import { AudioTranscribeButton } from './AudioTranscribeButton';
import {
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Loader2,
  FileText,
  Info,
  Radio,
  Zap,
  SkipForward,
  Flag,
  Trophy,
  RotateCcw,
  Gauge,
  Check,
} from 'lucide-react';

interface AdaptiveAssessmentProps {
  currentQuestion: Question | null;
  currentConcept: Concept | undefined;
  selectionMeta: AdaptiveSelectionMeta | null;
  conceptConfidence: number;
  isAnalyzing: boolean;
  error: string | null;
  feedback: AnswerAnalysisResult | null;
  sessionPacing: SessionPacing;
  onPacingChange: (pacing: SessionPacing) => void;
  sessionQuestionsAnswered: number;
  isSessionCompleted: boolean;
  concepts: Concept[];
  confidenceMap: Record<string, number>;
  onFastTrackMastery: () => void;
  onSkipQuestion: () => void;
  onFinishSessionEarly: () => void;
  onRestartSession: () => void;
  onSubmitAnswer: (answerText: string, image: SelectedImageInfo | null) => Promise<void>;
  onNextQuestion: () => void;
  onRetry: () => void;
  onOpenVoiceTutor?: () => void;
}

export function AdaptiveAssessment({
  currentQuestion,
  currentConcept,
  selectionMeta,
  conceptConfidence,
  isAnalyzing,
  error,
  feedback,
  sessionPacing,
  onPacingChange,
  sessionQuestionsAnswered,
  isSessionCompleted,
  concepts,
  confidenceMap,
  onFastTrackMastery,
  onSkipQuestion,
  onFinishSessionEarly,
  onRestartSession,
  onSubmitAnswer,
  onNextQuestion,
  onRetry,
  onOpenVoiceTutor,
}: AdaptiveAssessmentProps) {
  const [answerText, setAnswerText] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImageInfo | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!answerText.trim() && !selectedImage) || isAnalyzing) return;
    await onSubmitAnswer(answerText, selectedImage);
  };

  const handleTranscriptionReceived = (transcribedText: string) => {
    setAnswerText((prev) => (prev.trim() ? `${prev.trim()}\n${transcribedText}` : transcribedText));
  };

  const handleAdvance = () => {
    setAnswerText('');
    setSelectedImage(null);
    onNextQuestion();
  };

  // Determine question target based on pacing
  const targetQuestionBudget =
    sessionPacing === 'rapid' ? 3 : sessionPacing === 'standard' ? 5 : concepts.length * 2;

  const currentQuestionNumber = Math.min(sessionQuestionsAnswered + 1, targetQuestionBudget);

  // If session is completed or all targets reached
  if (isSessionCompleted) {
    const confValues = concepts.map((c) => confidenceMap[c.id] ?? 0.5);
    const avgConfidence =
      confValues.length > 0
        ? Math.round((confValues.reduce((a, b) => a + b, 0) / confValues.length) * 100)
        : 50;
    const masteredCount = confValues.filter((c) => c >= 0.7).length;

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center backdrop-blur-md shadow-2xl space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/20 to-indigo-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 rounded-full">
              Session Goal Completed
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Concise Diagnostic Complete!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Great job! You answered the targeted diagnostic questions without repetitive drilling. Your adaptive mastery profile has been calibrated.
          </p>
        </div>

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center font-mono">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Mastered</div>
            <div className="text-lg font-bold text-emerald-400">
              {masteredCount} / {concepts.length}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Avg Confidence</div>
            <div className="text-lg font-bold text-indigo-300">{avgConfidence}%</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Questions Asked</div>
            <div className="text-lg font-bold text-amber-300">{sessionQuestionsAnswered}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRestartSession}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start New Quick Check (3 Qs)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onPacingChange('comprehensive');
              onNextQuestion();
            }}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Practice Additional Questions</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-md shadow-xl flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-indigo-400 mb-3 animate-bounce" />
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Adaptive Diagnostic Ready</h3>
        <p className="text-sm text-slate-400 max-w-md mb-4">
          Ready to diagnose your understanding with a short, high-yield question set.
        </p>
        <button
          onClick={onNextQuestion}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          Begin Quick Diagnostic <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const difficultyColors = {
    foundational: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    intermediate: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    advanced: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col h-full">
      {/* Pacing & Progress Header */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Question Counter & Pacing Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-mono text-xs font-bold">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {sessionPacing === 'comprehensive'
                ? `Question ${sessionQuestionsAnswered + 1}`
                : `Question ${currentQuestionNumber} of ${targetQuestionBudget}`}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {sessionPacing === 'rapid'
              ? '⚡ Quick Diagnostic (3 Qs Max)'
              : sessionPacing === 'standard'
              ? '🎯 Standard Assessment (5 Qs)'
              : '📚 Full Curriculum'}
          </span>
        </div>

        {/* Pacing Selector Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Mode:</span>
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onPacingChange('rapid')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'rapid'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Fast 3-question diagnostic to avoid fatigue"
            >
              Quick (3 Qs)
            </button>
            <button
              type="button"
              onClick={() => onPacingChange('standard')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'standard'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard 5-question review"
            >
              Standard (5)
            </button>
            <button
              type="button"
              onClick={() => onPacingChange('comprehensive')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'comprehensive'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full thorough practice"
            >
              Full
            </button>
          </div>

          {/* Wrap Up Session Button */}
          {sessionQuestionsAnswered > 0 && (
            <button
              type="button"
              onClick={onFinishSessionEarly}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Conclude diagnostic session and review mastery now"
            >
              <Flag className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Finish Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Concept & Diagnostic Metadata */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
                difficultyColors[currentQuestion.difficulty]
              }`}
            >
              {currentQuestion.difficulty}
            </span>
            {currentQuestion.isPrerequisiteCheck && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Prerequisite Diagnostic
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Target Concept:</span>
            <span className="text-indigo-300 font-semibold">{currentQuestion.conceptName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">
              c = {conceptConfidence.toFixed(2)} ({Math.round(conceptConfidence * 100)}%)
            </span>
          </div>
        </div>

        {/* Adaptive Selection Rationale Banner */}
        {selectionMeta && (
          <div className="mt-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-indigo-300">Adaptive Rationale: </span>
              {selectionMeta.reason}
            </div>
          </div>
        )}
      </div>

      {/* Main Question & Solution Area */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
        {/* Question Prompt */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                Q
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-slate-100 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.prompt}
                </p>
                {currentQuestion.context && (
                  <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    Context: {currentQuestion.context}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Live Voice Tutor Launch Button */}
            {onOpenVoiceTutor && (
              <button
                type="button"
                onClick={onOpenVoiceTutor}
                className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
                title="Talk to AI tutor in real-time with Live API"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Tutor (Live API)</span>
                <span className="sm:hidden">Voice</span>
              </button>
            )}
          </div>
        </div>

        {/* Answer Submission Form (Shown when not reviewing feedback) */}
        {!feedback && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="answer-textarea"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Your Working & Reasoning
                </label>

                {/* Microphone Dictate Button using gemini-3.5-transcribe */}
                <AudioTranscribeButton
                  onTranscriptionComplete={handleTranscriptionReceived}
                  disabled={isAnalyzing}
                />
              </div>
              <textarea
                id="answer-textarea"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your algebraic steps, or click 'Dictate Answer' (gemini-3.5-transcribe), or attach handwritten work..."
                rows={3}
                disabled={isAnalyzing}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors font-mono resize-y"
              />
            </div>

            {/* Handwritten Image Upload Section */}
            <div>
              <ImageUpload
                selectedImage={selectedImage}
                onImageSelected={setSelectedImage}
                disabled={isAnalyzing}
              />
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Evaluation Error</p>
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Submission & Friction-Free Agency Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
              {/* Quick Knowledge Actions to prevent irritation */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onFastTrackMastery}
                  disabled={isAnalyzing}
                  className="px-3 py-2 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 hover:border-emerald-600 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Already know this concept? Mark as understood without typing"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>I Know This (+30% Mastery)</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipQuestion}
                  disabled={isAnalyzing}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Skip to another concept"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                id="submit-answer-btn"
                disabled={(!answerText.trim() && !selectedImage) || isAnalyzing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Feedback Display Card */}
        {feedback && (
          <div className="space-y-4 animate-fadeIn">
            <div
              className={`rounded-xl border p-4 sm:p-5 ${
                feedback.status === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/50'
                  : feedback.status === 'partly correct'
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-rose-950/40 border-rose-500/50'
              }`}
            >
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  {feedback.status === 'correct' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : feedback.status === 'partly correct' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="text-base font-bold capitalize text-slate-100">
                    {feedback.status} Solution
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-xs font-mono">
                    <span className="text-slate-400">Score:</span>
                    <span className="font-bold text-slate-200">
                      {Math.round(feedback.score * 100)}%
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      (feedback.confidenceDelta || 0) >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {(feedback.confidenceDelta || 0) >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {(feedback.confidenceDelta || 0) > 0 ? '+' : ''}
                      {feedback.confidenceDelta?.toFixed(2)} Confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback Body */}
              <div className="space-y-3 text-sm">
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Pedagogical Evaluation
                  </h5>
                  <p className="text-slate-200 leading-relaxed">{feedback.feedback}</p>
                </div>

                {feedback.misconception && feedback.misconception !== 'None' && (
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 text-xs">
                    <span className="font-semibold text-rose-300">Identified Misconception: </span>
                    <span className="text-slate-300">{feedback.misconception}</span>
                  </div>
                )}

                {feedback.writtenStepsAnalysis && (
                  <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/50 text-xs space-y-1">
                    <span className="font-semibold text-indigo-300">
                      Handwritten Vision Inspection:{' '}
                    </span>
                    <p className="text-slate-300">{feedback.writtenStepsAnalysis}</p>
                  </div>
                )}

                {feedback.recommendedAction && (
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
                    <span className="font-semibold text-amber-300">Recommended Next Step: </span>
                    <span className="text-slate-300">{feedback.recommendedAction}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Reference Solution Toggle / Accordion */}
            {currentQuestion.sampleSolution && (
              <details className="group bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
                <summary className="font-semibold text-indigo-300 cursor-pointer flex items-center justify-between">
                  <span>View Reference Solution & Rubric</span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  <p className="font-mono text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800">
                    {currentQuestion.sampleSolution}
                  </p>
                  {currentQuestion.rubricKeyPoints && (
                    <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                      {currentQuestion.rubricKeyPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            )}

            {/* Next Question Advance Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="next-adaptive-question-btn"
                onClick={handleAdvance}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {sessionQuestionsAnswered + 1 >= targetQuestionBudget &&
                  sessionPacing !== 'comprehensive'
                    ? 'Complete Session & View Summary'
                    : 'Continue to Next Adaptive Target'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
