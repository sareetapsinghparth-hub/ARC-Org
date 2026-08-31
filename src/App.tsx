import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LessonData,
  Concept,
  Question,
  AnswerAnalysisResult,
  SelectedImageInfo,
  AssessmentHistoryItem,
  AdaptiveSelectionMeta,
  SessionPacing,
} from './types';
import { DEFAULT_CURRICULA } from './data/defaultCurricula';
import { selectNextAdaptiveQuestion } from './utils/adaptiveEngine';
import { LessonHeader } from './components/LessonHeader';
import { GraphSidebar } from './components/GraphSidebar';
import { AdaptiveAssessment } from './components/AdaptiveAssessment';
import { ConceptInspector } from './components/ConceptInspector';
import { AssessmentHistory } from './components/AssessmentHistory';
import { MasteryMilestones } from './components/MasteryMilestones';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import {
  Sparkles,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Compass,
  Cpu,
  Layers,
  ChevronRight,
  Target,
} from 'lucide-react';

export default function App() {
  // Curriculum & Lesson state
  const [currentLesson, setCurrentLesson] = useState<LessonData>(
    DEFAULT_CURRICULA['calculus-derivatives']
  );
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isGraphSidebarOpen, setIsGraphSidebarOpen] = useState(false);

  // Confidence state: mapping of conceptId -> confidence number [0, 1]
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_CURRICULA['calculus-derivatives'].concepts.forEach((c) => {
      initial[c.id] = 0.5;
    });
    return initial;
  });

  // Asked questions tracking
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);

  // Current active assessment question & selection reasoning
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectionMeta, setSelectionMeta] = useState<AdaptiveSelectionMeta | null>(null);

  // Selected concept for inspector drawer
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  // Answer submission & feedback states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerAnalysisResult | null>(null);

  // Session history log
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);

  // Anti-fatigue Question Budget & Session Pacing
  const [sessionPacing, setSessionPacing] = useState<SessionPacing>('rapid');
  const [sessionQuestionsAnswered, setSessionQuestionsAnswered] = useState(0);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);

  // Initialize or pick the next adaptive question
  const pickNextQuestion = useCallback(
    (
      concepts: Concept[],
      prerequisites: LessonData['prerequisites'],
      questions: Question[],
      confMap: Record<string, number>,
      askedIds: string[],
      forcedConceptId?: string
    ) => {
      // If user manually chose a target concept from the inspector
      if (forcedConceptId) {
        const matchingQ =
          questions.find(
            (q) => q.conceptId === forcedConceptId && !askedIds.includes(q.id)
          ) || questions.find((q) => q.conceptId === forcedConceptId);

        if (matchingQ) {
          const targetConcept = concepts.find((c) => c.id === forcedConceptId);
          setCurrentQuestion(matchingQ);
          setSelectionMeta({
            selectedConceptId: forcedConceptId,
            selectedConceptName: targetConcept?.name || matchingQ.conceptName,
            reason: `Direct Student Focus: Specifically targeting "${targetConcept?.name || matchingQ.conceptName}" for practice.`,
            isPrerequisiteIntervention: false,
            conceptConfidence: confMap[forcedConceptId] ?? 0.5,
          });
          setFeedback(null);
          setAnalysisError(null);
          return;
        }
      }

      const result = selectNextAdaptiveQuestion(
        concepts,
        prerequisites,
        questions,
        confMap,
        askedIds
      );

      if (result.resetCycle) {
        setAskedQuestionIds(result.question ? [result.question.id] : []);
      }

      setCurrentQuestion(result.question);
      setSelectionMeta(result.meta);
      setFeedback(null);
      setAnalysisError(null);
    },
    []
  );

  // Initial load: trigger selection on mount or when curriculum changes
  useEffect(() => {
    pickNextQuestion(
      currentLesson.concepts,
      currentLesson.prerequisites,
      currentLesson.questions,
      confidenceMap,
      askedQuestionIds
    );
  }, [currentLesson]);

  // Handle Preset Switching
  const handleSelectPreset = (key: string) => {
    if (DEFAULT_CURRICULA[key]) {
      const lesson = DEFAULT_CURRICULA[key];
      setCurrentLesson(lesson);
      const newConf: Record<string, number> = {};
      lesson.concepts.forEach((c) => {
        newConf[c.id] = 0.5;
      });
      setConfidenceMap(newConf);
      setAskedQuestionIds([]);
      setFeedback(null);
      setAnalysisError(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);
      pickNextQuestion(lesson.concepts, lesson.prerequisites, lesson.questions, newConf, []);
    }
  };

  // Handle Custom AI Topic Generation via NVIDIA Nemotron 3 Ultra 550b
  const handleGenerateCustomLesson = async (topic: string) => {
    setIsLoadingLesson(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate curriculum (Status ${response.status})`);
      }

      const newLesson: LessonData = await response.json();
      setCurrentLesson(newLesson);

      const newConf: Record<string, number> = {};
      newLesson.concepts.forEach((c) => {
        newConf[c.id] = 0.5;
      });
      setConfidenceMap(newConf);
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);
      pickNextQuestion(newLesson.concepts, newLesson.prerequisites, newLesson.questions, newConf, []);
    } catch (err: any) {
      console.error('Error generating lesson:', err);
      setAnalysisError(`Could not generate curriculum for "${topic}". Using default lesson.`);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Reset confidence of all concepts to initial 0.5
  const handleResetConfidence = () => {
    const resetConf: Record<string, number> = {};
    currentLesson.concepts.forEach((c) => {
      resetConf[c.id] = 0.5;
    });
    setConfidenceMap(resetConf);
    setAskedQuestionIds([]);
    setFeedback(null);
    setAnalysisError(null);
    setSessionQuestionsAnswered(0);
    setIsSessionCompleted(false);
    pickNextQuestion(currentLesson.concepts, currentLesson.prerequisites, currentLesson.questions, resetConf, []);
  };

  // Fast-track mastery when user already knows the concept (+30% confidence boost, no fatigue)
  const handleFastTrackMastery = () => {
    if (!currentQuestion) return;

    const prevConfidence = confidenceMap[currentQuestion.conceptId] ?? 0.5;
    const newConfidence = Math.min(1, Number((prevConfidence + 0.30).toFixed(2)));

    const updatedConfidenceMap = {
      ...confidenceMap,
      [currentQuestion.conceptId]: newConfidence,
    };
    setConfidenceMap(updatedConfidenceMap);

    const newAsked = askedQuestionIds.includes(currentQuestion.id)
      ? askedQuestionIds
      : [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(newAsked);

    const nextCount = sessionQuestionsAnswered + 1;
    setSessionQuestionsAnswered(nextCount);

    const budget = sessionPacing === 'rapid' ? 3 : sessionPacing === 'standard' ? 5 : 999;
    if (sessionPacing !== 'comprehensive' && nextCount >= budget) {
      setIsSessionCompleted(true);
    } else {
      pickNextQuestion(
        currentLesson.concepts,
        currentLesson.prerequisites,
        currentLesson.questions,
        updatedConfidenceMap,
        newAsked
      );
    }
  };

  // Skip current question without confidence penalty
  const handleSkipQuestion = () => {
    if (!currentQuestion) return;

    const newAsked = askedQuestionIds.includes(currentQuestion.id)
      ? askedQuestionIds
      : [...askedQuestionIds, currentQuestion.id];
    setAskedQuestionIds(newAsked);

    pickNextQuestion(
      currentLesson.concepts,
      currentLesson.prerequisites,
      currentLesson.questions,
      confidenceMap,
      newAsked
    );
  };

  // Finish session early and view summary
  const handleFinishSessionEarly = () => {
    setIsSessionCompleted(true);
    setFeedback(null);
  };

  // Restart diagnostic session
  const handleRestartSession = () => {
    setSessionQuestionsAnswered(0);
    setIsSessionCompleted(false);
    setFeedback(null);
    pickNextQuestion(
      currentLesson.concepts,
      currentLesson.prerequisites,
      currentLesson.questions,
      confidenceMap,
      askedQuestionIds
    );
  };

  // Handle student answer submission
  const handleSubmitAnswer = async (answerText: string, image: SelectedImageInfo | null) => {
    if (!currentQuestion) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    const prevConfidence = confidenceMap[currentQuestion.conceptId] ?? 0.5;

    try {
      const response = await fetch('/api/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          concept: currentLesson.concepts.find((c) => c.id === currentQuestion.conceptId),
          studentAnswer: answerText,
          imageDataUrl: image?.dataUrl,
          currentConfidence: prevConfidence,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const result: AnswerAnalysisResult = await response.json();
      setFeedback(result);

      // Apply confidence update to the target concept node
      const delta = result.confidenceDelta ?? 0;
      const newConfidence = Math.max(0, Math.min(1, Number((prevConfidence + delta).toFixed(2))));

      const updatedConfidenceMap = {
        ...confidenceMap,
        [currentQuestion.conceptId]: newConfidence,
      };
      setConfidenceMap(updatedConfidenceMap);

      // Record in asked questions
      setAskedQuestionIds((prev) =>
        prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id]
      );

      // Increment session questions answered
      setSessionQuestionsAnswered((prev) => prev + 1);

      // Record in timeline history
      const historyEntry: AssessmentHistoryItem = {
        id: `history-${Date.now()}`,
        timestamp: Date.now(),
        question: currentQuestion,
        studentAnswer: answerText,
        imageAttached: Boolean(image),
        result,
        previousConfidence: prevConfidence,
        newConfidence,
      };
      setHistory((prev) => [...prev, historyEntry]);
    } catch (err: any) {
      console.error('Answer analysis failed:', err);
      setAnalysisError(
        'Failed to connect to evaluation engine. Please verify your connection or retry your submission.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Move to next adaptive target question
  const handleAdvanceToNextQuestion = () => {
    const budget = sessionPacing === 'rapid' ? 3 : sessionPacing === 'standard' ? 5 : 999;
    if (sessionPacing !== 'comprehensive' && sessionQuestionsAnswered >= budget) {
      setIsSessionCompleted(true);
      setFeedback(null);
      return;
    }

    pickNextQuestion(
      currentLesson.concepts,
      currentLesson.prerequisites,
      currentLesson.questions,
      confidenceMap,
      askedQuestionIds
    );
  };

  // Find concept details for current question
  const currentConcept = currentLesson.concepts.find(
    (c) => c.id === currentQuestion?.conceptId
  );
  const currentConceptConfidence =
    currentQuestion && confidenceMap[currentQuestion.conceptId] !== undefined
      ? confidenceMap[currentQuestion.conceptId]
      : 0.5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header & Navigation */}
      <LessonHeader
        currentLesson={currentLesson}
        confidenceMap={confidenceMap}
        isLoadingLesson={isLoadingLesson}
        onSelectPreset={handleSelectPreset}
        onGenerateCustomLesson={handleGenerateCustomLesson}
        onResetConfidence={handleResetConfidence}
        onOpenVoiceModal={() => setIsLiveVoiceOpen(true)}
        onToggleGraphSidebar={() => setIsGraphSidebarOpen((prev) => !prev)}
        isGraphSidebarOpen={isGraphSidebarOpen}
      />

      {/* Main Workspace Layout - Focused Single Question Centric Experience */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Concept Mastery & Learning Pathway Ribbon */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <h2 className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                Curriculum Learning Pathway
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsGraphSidebarOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer self-start sm:self-auto"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Explore Knowledge Graph ({currentLesson.concepts.length} Nodes)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal list of concepts for current topic */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {currentLesson.concepts.map((concept, idx) => {
              const conf = confidenceMap[concept.id] ?? 0.5;
              const isCurrent = currentQuestion?.conceptId === concept.id;
              const isTarget = selectionMeta?.selectedConceptId === concept.id;
              const isMastered = conf >= 0.7;
              const isStruggling = conf < 0.4;
              const indicatorColor = isMastered
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : isStruggling
                ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                : 'bg-amber-500 shadow-sm shadow-amber-500/50';

              return (
                <button
                  key={concept.id}
                  onClick={() => setSelectedConceptId(concept.id)}
                  className={`relative overflow-hidden pl-3.5 pr-3 py-2 rounded-xl text-left shrink-0 transition-all border cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-950/80 border-indigo-500/80 ring-1 ring-indigo-500 shadow-md shadow-indigo-950/50'
                      : isTarget
                      ? 'bg-cyan-950/40 border-cyan-500/40 hover:border-cyan-500/80'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                  title={`Click to inspect ${concept.name} (Confidence: ${Math.round(conf * 100)}%)`}
                >
                  {/* Left edge confidence status stripe */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorColor}`}
                    aria-hidden="true"
                  />

                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      0{idx + 1}
                    </span>
                    <span
                      className={`text-xs font-semibold truncate max-w-[140px] ${
                        isCurrent ? 'text-indigo-200' : 'text-slate-200'
                      }`}
                    >
                      {concept.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span
                      className={`${
                        isMastered
                          ? 'text-emerald-400 font-bold'
                          : isStruggling
                          ? 'text-rose-400 font-bold'
                          : 'text-amber-400 font-medium'
                      }`}
                    >
                      {Math.round(conf * 100)}%
                    </span>
                    {isCurrent && (
                      <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Single Question Evaluation Area */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                Active Assessment
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {sessionPacing === 'rapid'
                ? `⚡ Rapid Diagnostic (Max 3 Qs)`
                : sessionPacing === 'standard'
                ? `🎯 Standard (5 Qs)`
                : `Comprehensive (${askedQuestionIds.length} answered)`}
            </span>
          </div>

          {/* Active Adaptive Question Card with Anti-Fatigue Pacing */}
          <AdaptiveAssessment
            currentQuestion={currentQuestion}
            currentConcept={currentConcept}
            selectionMeta={selectionMeta}
            conceptConfidence={currentConceptConfidence}
            isAnalyzing={isAnalyzing}
            error={analysisError}
            feedback={feedback}
            sessionPacing={sessionPacing}
            onPacingChange={(p) => setSessionPacing(p)}
            sessionQuestionsAnswered={sessionQuestionsAnswered}
            isSessionCompleted={isSessionCompleted}
            concepts={currentLesson.concepts}
            confidenceMap={confidenceMap}
            onFastTrackMastery={handleFastTrackMastery}
            onSkipQuestion={handleSkipQuestion}
            onFinishSessionEarly={handleFinishSessionEarly}
            onRestartSession={handleRestartSession}
            onSubmitAnswer={handleSubmitAnswer}
            onNextQuestion={handleAdvanceToNextQuestion}
            onRetry={() => setAnalysisError(null)}
            onOpenVoiceTutor={() => setIsLiveVoiceOpen(true)}
          />

          {/* Mastery Milestones & Badges (80%+ Confidence) */}
          <MasteryMilestones
            concepts={currentLesson.concepts}
            confidenceMap={confidenceMap}
            latestEvaluatedConceptId={feedback ? currentQuestion?.conceptId : null}
            latestScoreDelta={feedback?.confidenceDelta}
            onSelectConcept={(id) => setSelectedConceptId(id)}
          />

          {/* Session Diagnostic History & Confidence Trend Chart */}
          <AssessmentHistory
            history={history}
            concepts={currentLesson.concepts}
          />
        </section>
      </main>

      {/* Slide-out Prerequisite Knowledge Graph Sidebar */}
      <GraphSidebar
        isOpen={isGraphSidebarOpen}
        onClose={() => setIsGraphSidebarOpen(false)}
        concepts={currentLesson.concepts}
        prerequisites={currentLesson.prerequisites}
        confidenceMap={confidenceMap}
        nextTargetConceptId={selectionMeta?.selectedConceptId || null}
        selectedConceptId={selectedConceptId}
        onSelectConcept={(id) => setSelectedConceptId(id)}
      />

      {/* Real-Time Live Voice Tutor Modal (gemini-3.1-flash-live-preview) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentQuestion={currentQuestion}
        currentConcept={currentConcept}
      />

      {/* Slide-out Concept Inspector Drawer */}
      <ConceptInspector
        conceptId={selectedConceptId}
        concepts={currentLesson.concepts}
        prerequisites={currentLesson.prerequisites}
        questions={currentLesson.questions}
        confidenceMap={confidenceMap}
        onClose={() => setSelectedConceptId(null)}
        onSelectAsTarget={(conceptId) => {
          pickNextQuestion(
            currentLesson.concepts,
            currentLesson.prerequisites,
            currentLesson.questions,
            confidenceMap,
            askedQuestionIds,
            conceptId
          );
        }}
      />
    </div>
  );
}
