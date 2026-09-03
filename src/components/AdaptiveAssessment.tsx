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
  MessageSquare,
  GitFork,
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
  onOpenAiChat?: () => void;
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
  onOpenAiChat,
}: AdaptiveAssessmentProps) {
  const [answerText, setAnswerText] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImageInfo | null>(null);
  const [showRationale, setShowRationale] = useState(false);

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
    const assessedConcepts = concepts.filter(
      (c) => confidenceMap[c.id] !== undefined && confidenceMap[c.id] !== null
    );
    const assessedCount = assessedConcepts.length;
    const confValues = assessedConcepts.map((c) => confidenceMap[c.id] as number);
    const avgConfidence =
      assessedCount > 0
        ? Math.round((confValues.reduce((a, b) => a + b, 0) / assessedCount) * 100)
        : null;
    const masteredCount = confValues.filter((c) => c >= 0.75).length;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-md space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 via-emerald-100 to-indigo-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-0.5 rounded-full">
              Session Goal Completed
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            Concise Diagnostic Complete!
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Great job! You answered targeted diagnostic questions without repetitive drilling. Your adaptive mastery profile has been calibrated.
          </p>
        </div>

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center font-mono">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">Mastered</div>
            <div className="text-lg font-bold text-emerald-600">
              {masteredCount} / {concepts.length}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">Assessed Mastery</div>
            <div className="text-lg font-bold text-indigo-600">
              {avgConfidence !== null ? `${avgConfidence}%` : 'Pending'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">Questions Answered</div>
            <div className="text-lg font-bold text-amber-600">{sessionQuestionsAnswered}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRestartSession}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
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
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Practice Additional Questions</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-indigo-600 mb-3 animate-bounce" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Adaptive Diagnostic Ready</h3>
        <p className="text-sm text-slate-600 max-w-md mb-4">
          Ready to diagnose your understanding with a short, high-yield question set.
        </p>
        <button
          onClick={onNextQuestion}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          Begin Quick Diagnostic <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const difficultyColors = {
    foundational: 'bg-blue-50 text-blue-700 border-blue-200',
    intermediate: 'bg-purple-50 text-purple-700 border-purple-200',
    advanced: 'bg-amber-50 text-amber-800 border-amber-200',
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col h-full">
      {/* Pacing & Progress Sub-Header */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Question Counter & Difficulty */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-800">
            {sessionPacing === 'comprehensive'
              ? `Question ${sessionQuestionsAnswered + 1}`
              : `Question ${currentQuestionNumber} of ${targetQuestionBudget}`}
          </span>
          <span className="text-slate-300">•</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              difficultyColors[currentQuestion.difficulty]
            }`}
          >
            {currentQuestion.difficulty}
          </span>
          {currentQuestion.isPrerequisiteCheck && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
              Prerequisite
            </span>
          )}
        </div>

        {/* Pacing Mode Selector & Finish Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => onPacingChange('rapid')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'rapid'
                  ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Quick (3)
            </button>
            <button
              type="button"
              onClick={() => onPacingChange('standard')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'standard'
                  ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Standard (5)
            </button>
            <button
              type="button"
              onClick={() => onPacingChange('comprehensive')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                sessionPacing === 'comprehensive'
                  ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Full
            </button>
          </div>

          {sessionQuestionsAnswered > 0 && (
            <button
              type="button"
              onClick={onFinishSessionEarly}
              className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Conclude diagnostic session"
            >
              Finish Now
            </button>
          )}
        </div>
      </div>

      {/* Target Concept & Subtle Adaptive Rationale Accordion */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">Target Concept:</span>
          <span className="font-semibold text-slate-900">{currentQuestion.conceptName}</span>
          {confidenceMap[currentQuestion.conceptId] !== undefined ? (
            <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
              {Math.round((confidenceMap[currentQuestion.conceptId] || 0) * 100)}% mastery
            </span>
          ) : (
            <span className="text-indigo-700 font-mono text-[11px] bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
              Initial Diagnostic (Unassessed)
            </span>
          )}
        </div>

        {selectionMeta && (
          <button
            type="button"
            onClick={() => setShowRationale(!showRationale)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium cursor-pointer transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showRationale ? 'Hide rationale' : 'Why this question?'}</span>
          </button>
        )}
      </div>

      {showRationale && selectionMeta && (
        <div className="mx-5 mb-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 animate-fadeIn">
          <span className="font-semibold text-indigo-800">Adaptive Rationale: </span>
          {selectionMeta.reason}
        </div>
      )}

      {/* Main Question & Solution Area */}
      <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5">
        {/* Question Prompt */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 sm:p-5">
          <div className="space-y-2">
            <p className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">
              {currentQuestion.prompt}
            </p>
            {currentQuestion.context && (
              <p className="text-xs text-slate-500 italic pt-1">
                Context: {currentQuestion.context}
              </p>
            )}
          </div>
        </div>

        {/* Answer Submission Form (Shown when not reviewing feedback) */}
        {!feedback && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="answer-textarea"
                  className="text-xs font-semibold text-slate-700"
                >
                  Your Answer & Working Steps
                </label>

                {/* Microphone Dictate Button */}
                <AudioTranscribeButton
                  onTranscriptionComplete={handleTranscriptionReceived}
                  disabled={isAnalyzing}
                />
              </div>
              <textarea
                id="answer-textarea"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your reasoning, step-by-step solution, or algebraic answer..."
                rows={3}
                disabled={isAnalyzing}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors font-mono resize-y"
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Evaluation Error</p>
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Actions: Fast track, skip, submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onFastTrackMastery}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Mark concept as mastered without typing"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>I Know This (Master Concept)</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipQuestion}
                  disabled={isAnalyzing}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="Skip to another concept"
                >
                  Skip
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                id="submit-answer-btn"
                disabled={(!answerText.trim() && !selectedImage) || isAnalyzing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
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
                  ? 'bg-emerald-50/90 border-emerald-300'
                  : feedback.status === 'partly correct'
                  ? 'bg-amber-50/90 border-amber-300'
                  : 'bg-rose-50/90 border-rose-300'
              }`}
            >
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {feedback.status === 'correct' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : feedback.status === 'partly correct' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span className="text-base font-bold capitalize text-slate-900">
                    {feedback.status} Solution
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono shadow-xs">
                    <span className="text-slate-500">Score:</span>
                    <span className="font-bold text-slate-900">
                      {Math.round(feedback.score * 100)}%
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      (feedback.confidenceDelta || 0) >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
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
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Pedagogical Evaluation
                  </h5>
                  <p className="text-slate-800 leading-relaxed">{feedback.feedback}</p>
                </div>

                {feedback.misconception && feedback.misconception !== 'None' && (
                  <div className="bg-white p-3 rounded-lg border border-rose-200 text-xs">
                    <span className="font-semibold text-rose-700">Identified Misconception: </span>
                    <span className="text-slate-700">{feedback.misconception}</span>
                  </div>
                )}

                {feedback.writtenStepsAnalysis && (
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 text-xs space-y-1">
                    <span className="font-semibold text-indigo-700">
                      Handwritten Vision Inspection:{' '}
                    </span>
                    <p className="text-slate-700">{feedback.writtenStepsAnalysis}</p>
                  </div>
                )}

                {feedback.graphUpdate && (
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 text-xs space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                      <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                      <span>K-Graph (Prerequisite Graph) Diagnostic Update</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {feedback.graphUpdate.reasoning}
                    </p>
                    {feedback.graphUpdate.verifiedPrereqIds && feedback.graphUpdate.verifiedPrereqIds.length > 0 && (
                      <div className="text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Prerequisites validated in graph: {feedback.graphUpdate.verifiedPrereqIds.join(', ')}</span>
                      </div>
                    )}
                    {feedback.graphUpdate.flaggedGapPrereqIds && feedback.graphUpdate.flaggedGapPrereqIds.length > 0 && (
                      <div className="text-rose-700 font-medium flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Prerequisite gaps flagged for reinforcement: {feedback.graphUpdate.flaggedGapPrereqIds.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {feedback.recommendedAction && (
                  <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs">
                    <span className="font-semibold text-amber-800">Recommended Next Step: </span>
                    <span className="text-slate-700">{feedback.recommendedAction}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Reference Solution Toggle / Accordion */}
            {currentQuestion.sampleSolution && (
              <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                <summary className="font-semibold text-indigo-700 cursor-pointer flex items-center justify-between">
                  <span>View Reference Solution & Rubric</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  <p className="font-mono text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                    {currentQuestion.sampleSolution}
                  </p>
                  {currentQuestion.rubricKeyPoints && (
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
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
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
