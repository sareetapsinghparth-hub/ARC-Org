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
  SavedLearningSession,
} from './types';
import { DEFAULT_CURRICULA } from './data/defaultCurricula';
import { selectNextAdaptiveQuestion } from './utils/adaptiveEngine';
import { getConceptStatus, getStatusBadgeInfo } from './utils/kGraphJudgment';
import { buildClientCurriculum } from './utils/curriculumBuilder';
import { LessonHeader } from './components/LessonHeader';
import { GraphSidebar } from './components/GraphSidebar';
import { AdaptiveAssessment } from './components/AdaptiveAssessment';
import { ConceptInspector } from './components/ConceptInspector';
import { AssessmentHistory } from './components/AssessmentHistory';
import { MasteryMilestones } from './components/MasteryMilestones';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { StudyPortalModal } from './components/StudyPortalModal';
import { AiChatDrawer } from './components/AiChatDrawer';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { SessionsSidebar } from './components/SessionsSidebar';
import { StartWorkspace } from './components/StartWorkspace';
import {
  GitFork,
  ChevronRight,
  Columns,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  BookOpen,
  Info,
  ShieldCheck,
  Zap,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  Radio,
  FileText,
  Globe,
  ExternalLink,
} from 'lucide-react';

const INITIAL_SAVED_SESSIONS: SavedLearningSession[] = [
  {
    id: 'session-calculus',
    topic: 'Calculus: Derivatives & Chain Rule',
    overview: 'Foundational limits, rates of change, power rule, and composite functions.',
    sourceType: 'preset',
    sourceName: 'Calculus: Derivatives & Chain Rule',
    createdAt: Date.now() - 3600000 * 2,
    lastActiveAt: Date.now() - 3600000 * 2,
    totalConcepts: 5,
    masteredCount: 2,
    lessonData: DEFAULT_CURRICULA['calculus-derivatives'],
    confidenceMap: { 'c-1': 0.85, 'c-2': 0.80, 'c-3': 0.65 },
    verifiedPrereqMap: { 'c-1->c-2': true },
  },
  {
    id: 'session-quantum',
    topic: 'Quantum Mechanics: Wavefunctions & Operators',
    overview: 'State vectors, operators, Hilbert space, and measurement collapse.',
    sourceType: 'preset',
    sourceName: 'Quantum Mechanics: Wavefunctions & Operators',
    createdAt: Date.now() - 86400000,
    lastActiveAt: Date.now() - 86400000,
    totalConcepts: 5,
    masteredCount: 1,
    lessonData: DEFAULT_CURRICULA['quantum-mechanics'],
    confidenceMap: { 'qm-1': 0.90, 'qm-2': 0.55 },
    verifiedPrereqMap: {},
  },
  {
    id: 'session-ml',
    topic: 'Machine Learning: Backprop & Loss Surfaces',
    overview: 'Gradient descent, backpropagation DAGs, activation functions, and regularization.',
    sourceType: 'web-search',
    sourceName: 'Web Search: Backpropagation & Optimization',
    createdAt: Date.now() - 86400000 * 2,
    lastActiveAt: Date.now() - 86400000 * 2,
    totalConcepts: 5,
    masteredCount: 3,
    lessonData: DEFAULT_CURRICULA['machine-learning'],
    confidenceMap: { 'ml-1': 0.95, 'ml-2': 0.85, 'ml-3': 0.80 },
    verifiedPrereqMap: { 'ml-1->ml-2': true },
  },
];

export default function App() {
  // Application Mode: Landing/Clean start workspace vs Active assessment studio
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSessionsSidebarOpen, setIsSessionsSidebarOpen] = useState<boolean>(true);

  // Saved learning sessions history
  const [savedSessions, setSavedSessions] = useState<SavedLearningSession[]>(() => {
    try {
      const cached = localStorage.getItem('arc_saved_sessions_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAVED_SESSIONS;
  });

  // Curriculum & Lesson state
  const [currentLesson, setCurrentLesson] = useState<LessonData>(
    DEFAULT_CURRICULA['calculus-derivatives']
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isGraphSidebarOpen, setIsGraphSidebarOpen] = useState(false);
  const [isStudyPortalOpen, setIsStudyPortalOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Confidence state: mapping of conceptId -> confidence number [0, 1] or undefined (unassessed)
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number | undefined>>({});

  // Verified prerequisite map from diagnostic evaluations
  const [verifiedPrereqMap, setVerifiedPrereqMap] = useState<Record<string, boolean>>({});

  // Asked questions tracking
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);

  // Current active assessment question & selection reasoning
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectionMeta, setSelectionMeta] = useState<AdaptiveSelectionMeta | null>(null);

  // Selected concept for inspector drawer
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const handleSelectConcept = useCallback((conceptId: string) => {
    setSelectedConceptId(conceptId);
  }, []);

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
  const [dashboardTab, setDashboardTab] = useState<'analytics' | 'milestones'>('analytics');

  // Workspace Layout & Graph Display Modes
  const [layoutMode, setLayoutMode] = useState<'split' | 'graph' | 'assessment'>('assessment');
  const [graphViewMode, setGraphViewMode] = useState<'standard' | 'heatmap'>('standard');
  const [mobileActiveTab, setMobileActiveTab] = useState<'graph' | 'assessment' | 'analytics'>('split');

  // Initialize or pick the next adaptive question
  const pickNextQuestion = useCallback(
    (
      concepts: Concept[],
      prerequisites: LessonData['prerequisites'],
      questions: Question[],
      confMap: Record<string, number | undefined>,
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

  // Helper: Save or update session in history and localStorage
  const saveOrUpdateSession = (
    lesson: LessonData,
    confMap: Record<string, number | undefined>,
    prereqMap: Record<string, boolean>
  ) => {
    setSavedSessions((prev) => {
      const existingIndex = prev.findIndex(
        (s) => s.topic.toLowerCase() === lesson.topic.toLowerCase()
      );
      const mastered = Object.values(confMap).filter((v) => v !== undefined && v >= 0.75).length;
      const sessionId =
        existingIndex >= 0 ? prev[existingIndex].id : `session-${Date.now()}`;
      const sessionObj: SavedLearningSession = {
        id: sessionId,
        topic: lesson.topic,
        overview: lesson.overview,
        sourceType: lesson.sourceType || 'custom-topic',
        sourceName: lesson.sourceName,
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : Date.now(),
        lastActiveAt: Date.now(),
        totalConcepts: lesson.concepts.length,
        masteredCount: mastered,
        lessonData: lesson,
        confidenceMap: confMap,
        verifiedPrereqMap: prereqMap,
        webSources: lesson.webSources,
      };

      let updated: SavedLearningSession[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = sessionObj;
      } else {
        updated = [sessionObj, ...prev];
      }

      try {
        localStorage.setItem('arc_saved_sessions_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setActiveSessionId(sessionId);
      return updated;
    });
  };

  // Handle Web Search Grounded Curriculum Generation
  const handleSearchWeb = async (searchQuery: string) => {
    setIsLoadingLesson(true);
    setAnalysisError(null);
    setIsSessionActive(true);
    try {
      const response = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: searchQuery,
          isWebSearch: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve search results (Status ${response.status})`);
      }

      const newLesson: LessonData = await response.json();
      setCurrentLesson(newLesson);

      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(newLesson, emptyConf, {});
      pickNextQuestion(
        newLesson.concepts,
        newLesson.prerequisites,
        newLesson.questions,
        emptyConf,
        []
      );
    } catch (err: any) {
      console.error('Error conducting web search:', err);
      // Construct resilient smart curriculum for the web search query
      const fallbackLesson = buildClientCurriculum(searchQuery, true);

      setCurrentLesson(fallbackLesson);
      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(fallbackLesson, emptyConf, {});
      pickNextQuestion(
        fallbackLesson.concepts,
        fallbackLesson.prerequisites,
        fallbackLesson.questions,
        emptyConf,
        []
      );
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Handle File Upload from Ingestion Card or Dropzone
  const handleUploadFile = async (file: File) => {
    setIsSessionActive(true);
    const cleanTopic = file.name.replace(/\.[^/.]+$/, '');
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await handleGenerateFromPdf(dataUrl, file.name, cleanTopic);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await handleGenerateFromPdf(dataUrl, file.name, cleanTopic);
      };
      reader.readAsDataURL(file);
    } else {
      const text = await file.text();
      await handleGenerateFromText(text, cleanTopic);
    }
  };

  // Handle Preset Switching
  const handleSelectPreset = (key: string) => {
    if (DEFAULT_CURRICULA[key]) {
      const lesson = DEFAULT_CURRICULA[key];
      setCurrentLesson(lesson);
      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setAnalysisError(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);
      setIsSessionActive(true);

      saveOrUpdateSession(lesson, emptyConf, {});
      pickNextQuestion(lesson.concepts, lesson.prerequisites, lesson.questions, emptyConf, []);
    }
  };

  // Handle Custom AI Topic Generation
  const handleGenerateCustomLesson = async (topic: string) => {
    setIsLoadingLesson(true);
    setAnalysisError(null);
    setIsSessionActive(true);
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

      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(newLesson, emptyConf, {});
      pickNextQuestion(newLesson.concepts, newLesson.prerequisites, newLesson.questions, emptyConf, []);
    } catch (err: any) {
      console.warn('Error generating lesson via API, building client curriculum:', err);
      const fallbackLesson = buildClientCurriculum(topic, false);
      setCurrentLesson(fallbackLesson);
      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(fallbackLesson, emptyConf, {});
      pickNextQuestion(fallbackLesson.concepts, fallbackLesson.prerequisites, fallbackLesson.questions, emptyConf, []);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Handle Custom Notes / Raw Text Curriculum Ingestion
  const handleGenerateFromText = async (customText: string, topicName: string) => {
    setIsLoadingLesson(true);
    setAnalysisError(null);
    setIsSessionActive(true);
    try {
      const response = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customText, topic: topicName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to deconstruct study notes (Status ${response.status})`);
      }

      const newLesson: LessonData = await response.json();
      setCurrentLesson(newLesson);

      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(newLesson, emptyConf, {});
      pickNextQuestion(newLesson.concepts, newLesson.prerequisites, newLesson.questions, emptyConf, []);
    } catch (err: any) {
      console.warn('Error ingesting custom text, building client curriculum:', err);
      const fallbackLesson = buildClientCurriculum(topicName || 'Custom Notes', false, customText);
      setCurrentLesson(fallbackLesson);
      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(fallbackLesson, emptyConf, {});
      pickNextQuestion(fallbackLesson.concepts, fallbackLesson.prerequisites, fallbackLesson.questions, emptyConf, []);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Handle PDF Document Ingestion into Model
  const handleGenerateFromPdf = async (pdfDataUrl: string, fileName: string, topicName: string) => {
    setIsLoadingLesson(true);
    setAnalysisError(null);
    setIsSessionActive(true);
    try {
      const response = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfDataUrl, pdfFileName: fileName, topic: topicName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ingest PDF into model (Status ${response.status})`);
      }

      const newLesson: LessonData = await response.json();
      setCurrentLesson(newLesson);

      const emptyConf: Record<string, number | undefined> = {};
      setConfidenceMap(emptyConf);
      setVerifiedPrereqMap({});
      setAskedQuestionIds([]);
      setFeedback(null);
      setSelectedConceptId(null);
      setSessionQuestionsAnswered(0);
      setIsSessionCompleted(false);

      saveOrUpdateSession(newLesson, emptyConf, {});
      pickNextQuestion(newLesson.concepts, newLesson.prerequisites, newLesson.questions, emptyConf, []);
    } catch (err: any) {
      console.error('Error ingesting PDF:', err);
      setAnalysisError(`Could not parse PDF file "${fileName}". Please ensure it is a valid document.`);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  // Select a past session from the history sidebar
  const handleSelectSavedSession = (session: SavedLearningSession) => {
    setCurrentLesson(session.lessonData);
    setConfidenceMap(session.confidenceMap || {});
    setVerifiedPrereqMap(session.verifiedPrereqMap || {});
    setActiveSessionId(session.id);
    setAskedQuestionIds([]);
    setFeedback(null);
    setSelectedConceptId(null);
    setSessionQuestionsAnswered(0);
    setIsSessionCompleted(false);
    setIsSessionActive(true);
    pickNextQuestion(
      session.lessonData.concepts,
      session.lessonData.prerequisites,
      session.lessonData.questions,
      session.confidenceMap || {},
      []
    );
  };

  // Delete a past session from history
  const handleDeleteSavedSession = (sessionId: string) => {
    setSavedSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem('arc_saved_sessions_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setIsSessionActive(false);
    }
  };

  // Clear all past sessions
  const handleClearAllSessions = () => {
    setSavedSessions([]);
    try {
      localStorage.removeItem('arc_saved_sessions_v1');
    } catch {
      // ignore
    }
    setActiveSessionId(null);
    setIsSessionActive(false);
  };

  // Reset to starting workspace (New Topic / Search)
  const handleStartNewSession = () => {
    setIsSessionActive(false);
    setActiveSessionId(null);
    setFeedback(null);
    setSelectedConceptId(null);
  };

  // Reset confidence of all concepts to unassessed
  const handleResetConfidence = () => {
    const emptyConf: Record<string, number | undefined> = {};
    setConfidenceMap(emptyConf);
    setVerifiedPrereqMap({});
    setAskedQuestionIds([]);
    setFeedback(null);
    setAnalysisError(null);
    setSessionQuestionsAnswered(0);
    setIsSessionCompleted(false);
    pickNextQuestion(currentLesson.concepts, currentLesson.prerequisites, currentLesson.questions, emptyConf, []);
  };

  // Fast-track mastery when user already knows the concept
  const handleFastTrackMastery = () => {
    if (!currentQuestion) return;

    const prevConfidence = confidenceMap[currentQuestion.conceptId];
    const newConfidence = prevConfidence !== undefined
      ? Math.min(1, Number((prevConfidence + 0.30).toFixed(2)))
      : 0.85;

    const updatedConfidenceMap: Record<string, number | undefined> = {
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

    const prevConfidence = confidenceMap[currentQuestion.conceptId];

    try {
      const response = await fetch('/api/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          concept: currentLesson.concepts.find((c) => c.id === currentQuestion.conceptId),
          studentAnswer: answerText,
          imageDataUrl: image?.dataUrl,
          currentConfidence: prevConfidence ?? 0.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const result: AnswerAnalysisResult = await response.json();
      setFeedback(result);

      // Apply confidence update to the target concept node based on diagnostic evaluation
      let newConfidence: number;
      if (prevConfidence === undefined) {
        // Initial diagnostic calibration directly derived from judged answer score
        if (result.score >= 0.8) {
          newConfidence = Math.max(0.75, Number(result.score.toFixed(2)));
        } else if (result.score >= 0.5) {
          newConfidence = Number(result.score.toFixed(2));
        } else {
          newConfidence = Math.min(0.45, Number(result.score.toFixed(2)));
        }
      } else {
        const delta = result.confidenceDelta ?? 0;
        newConfidence = Math.max(0, Math.min(1, Number((prevConfidence + delta).toFixed(2))));
      }

      const updatedConfidenceMap: Record<string, number | undefined> = {
        ...confidenceMap,
        [currentQuestion.conceptId]: newConfidence,
      };

      // Check for prerequisite verification updates from the K-graph judgment
      if (result.graphUpdate?.verifiedPrereqIds?.length) {
        setVerifiedPrereqMap((prev) => {
          const next = { ...prev };
          result.graphUpdate?.verifiedPrereqIds.forEach((id) => {
            next[id] = true;
          });
          return next;
        });
      }

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
        previousConfidence: prevConfidence ?? 0,
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
      ? (confidenceMap[currentQuestion.conceptId] as number)
      : 0.5;

  // Live curriculum & diagnostic statistics
  const assessedConcepts = currentLesson.concepts.filter(
    (c) => confidenceMap[c.id] !== undefined && confidenceMap[c.id] !== null
  );
  const assessedCount = assessedConcepts.length;
  const totalConceptsCount = currentLesson.concepts.length;
  const confidences = assessedConcepts.map((c) => confidenceMap[c.id] as number);
  const masteredCount = confidences.filter((c) => c >= 0.75).length;
  const reviewCount = confidences.filter((c) => c < 0.5).length;
  const developingCount = confidences.filter((c) => c >= 0.5 && c < 0.75).length;
  const unassessedCount = totalConceptsCount - assessedCount;
  const verifiedLinksCount = Object.keys(verifiedPrereqMap).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header & Navigation */}
      <LessonHeader
        currentLesson={currentLesson}
        confidenceMap={confidenceMap}
        isLoadingLesson={isLoadingLesson}
        onSelectPreset={handleSelectPreset}
        onGenerateCustomLesson={handleGenerateCustomLesson}
        onResetConfidence={handleResetConfidence}
        onOpenVoiceModal={() => setIsLiveVoiceOpen(true)}
        onOpenChatModal={() => setIsAiChatOpen(true)}
        onOpenStudyPortal={() => setIsStudyPortalOpen(true)}
        onToggleGraphSidebar={() => setIsGraphSidebarOpen((prev) => !prev)}
        isGraphSidebarOpen={isGraphSidebarOpen}
        onToggleSessionsSidebar={() => setIsSessionsSidebarOpen((prev) => !prev)}
        onGoHome={handleStartNewSession}
        isSessionActive={isSessionActive}
      />

      {/* Conditional Layout: Clean Starting Screen vs Active Diagnostic Studio */}
      {!isSessionActive ? (
        <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-65px)]">
          {/* Left: Older chats like section */}
          <SessionsSidebar
            sessions={savedSessions}
            activeSessionId={activeSessionId}
            isOpen={isSessionsSidebarOpen}
            onToggleOpen={() => setIsSessionsSidebarOpen((prev) => !prev)}
            onSelectSession={handleSelectSavedSession}
            onNewSession={handleStartNewSession}
            onDeleteSession={handleDeleteSavedSession}
            onClearAllSessions={handleClearAllSessions}
          />

          {/* Right: Un-congested options of K-Graph and tools, and reactive search / upload portal */}
          <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
            <StartWorkspace
              isLoading={isLoadingLesson}
              onSearchWeb={handleSearchWeb}
              onUploadFile={handleUploadFile}
              onSelectPreset={handleSelectPreset}
              onOpenGraphSidebar={() => setIsGraphSidebarOpen(true)}
              onOpenStudyPortal={() => setIsStudyPortalOpen(true)}
              onOpenVoiceModal={() => setIsLiveVoiceOpen(true)}
              onOpenChatModal={() => setIsAiChatOpen(true)}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-65px)]">
          {/* Left: Sessions Sidebar (collapsible during active practice) */}
          <SessionsSidebar
            sessions={savedSessions}
            activeSessionId={activeSessionId}
            isOpen={isSessionsSidebarOpen}
            onToggleOpen={() => setIsSessionsSidebarOpen((prev) => !prev)}
            onSelectSession={handleSelectSavedSession}
            onNewSession={handleStartNewSession}
            onDeleteSession={handleDeleteSavedSession}
            onClearAllSessions={handleClearAllSessions}
          />

          {/* Active Diagnostic & Learning Studio */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Google Search Grounded Sources Citation Bar */}
            {currentLesson.webSources && currentLesson.webSources.length > 0 && (
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-sky-100 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-800 shrink-0">
                    <Globe className="w-3.5 h-3.5 text-sky-600" />
                    Web Grounded Sources:
                  </span>
                  {currentLesson.webSources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-200/80 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0"
                    >
                      <span className="truncate max-w-[180px]">{source.title || source.url}</span>
                      <ExternalLink className="w-3 h-3 text-sky-500 shrink-0" />
                    </a>
                  ))}
                </div>
                <span className="text-[11px] text-sky-600 font-mono hidden md:inline shrink-0">
                  Google Search Grounded
                </span>
              </div>
            )}

            {/* Interactive Command & Diagnostic HUD Ribbon */}
            <div className="bg-white/95 border-b border-slate-200 shadow-2xs px-4 sm:px-6 py-2.5">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Active Curriculum & Frontier Target */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-900 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[200px]">{currentLesson.topic}</span>
              <span className="text-indigo-400 font-normal">|</span>
              <span className="font-mono text-[11px] text-indigo-700">
                {currentLesson.concepts.length} Concepts • {currentLesson.prerequisites.length} Edges
              </span>
            </div>

            {/* Active Frontier Target Chip */}
            {selectionMeta && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                <span className="text-slate-500 font-medium">Frontier:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                  {selectionMeta.selectedConceptName}
                </span>
                {selectionMeta.isPrerequisiteIntervention && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Diagnostic Gap
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Center: Live Diagnostic Counters */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div
              className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg text-xs font-medium"
              title={`${masteredCount} of ${totalConceptsCount} concepts verified mastered (≥75% confidence)`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{masteredCount} Mastered</span>
            </div>

            <div
              className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg text-xs font-medium"
              title={`${developingCount} concepts developing (50%–74% confidence)`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>{developingCount} Developing</span>
            </div>

            {reviewCount > 0 && (
              <div
                className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-800 px-2 py-1 rounded-lg text-xs font-medium animate-pulse"
                title={`${reviewCount} prerequisite gaps detected (<50% confidence)`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{reviewCount} Prereq Gap{reviewCount > 1 ? 's' : ''}</span>
              </div>
            )}

            <div
              className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-medium"
              title={`${unassessedCount} concepts not yet tested`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{unassessedCount} Unassessed</span>
            </div>

            {verifiedLinksCount > 0 && (
              <div
                className="hidden xl:flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-1 rounded-lg text-xs font-medium"
                title={`${verifiedLinksCount} prerequisite relationships verified`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{verifiedLinksCount} Links Verified</span>
              </div>
            )}
          </div>

          {/* Right: Workspace Layout & View Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile Tab Switcher (Visible only on < lg) */}
            <div className="flex lg:hidden bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setMobileActiveTab('graph')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  mobileActiveTab === 'graph'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Graph
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab('assessment')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  mobileActiveTab === 'assessment'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Practice
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab('analytics')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  mobileActiveTab === 'analytics'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
            </div>

            {/* Desktop Layout Selector */}
            <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'split'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split Studio: Knowledge Graph + Adaptive Assessment"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'graph'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Graph Focus: Maximized Prerequisite Knowledge Graph"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Graph Focus</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('assessment')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'assessment'
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Assessment Focus: Focused Diagnostic Practice"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Assessment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* DESKTOP SPLIT STUDIO LAYOUT */}
        {layoutMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Knowledge Graph Studio + Curriculum Pathway + Analytics */}
            <div
              className={`lg:col-span-7 xl:col-span-7 space-y-5 ${
                mobileActiveTab === 'assessment' ? 'hidden lg:block' : ''
              }`}
            >
              {/* Prerequisite Knowledge Graph Studio Card */}
              <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                {/* Graph Studio Header Bar */}
                <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg border transition-colors ${
                        graphViewMode === 'heatmap'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      }`}
                    >
                      {graphViewMode === 'heatmap' ? (
                        <Flame className="w-4 h-4 text-red-600" />
                      ) : (
                        <GitFork className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>
                          {graphViewMode === 'heatmap'
                            ? 'Diagnostic Heatmap Graph'
                            : 'Prerequisite Knowledge Graph'}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                          Interactive Live Canvas
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Directed edges represent prerequisite paths. Click any node to inspect or focus practice.
                      </p>
                    </div>
                  </div>

                  {/* Graph Quick Controls */}
                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setGraphViewMode('standard')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          graphViewMode === 'standard'
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Standard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGraphViewMode('heatmap')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          graphViewMode === 'heatmap'
                            ? 'bg-gradient-to-r from-red-600 to-indigo-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Flame className="w-3 h-3 text-red-500" />
                        <span>Heatmap</span>
                      </button>
                    </div>

                    {/* Node Inspector Trigger */}
                    {selectedConceptId && (
                      <button
                        type="button"
                        onClick={() => setSelectedConceptId(selectedConceptId)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Inspect Node</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ReactFlow Graph Canvas Container */}
                <div className="h-[520px] sm:h-[580px] w-full relative bg-slate-50">
                  <KnowledgeGraph
                    concepts={currentLesson.concepts}
                    prerequisites={currentLesson.prerequisites}
                    confidenceMap={confidenceMap}
                    verifiedPrereqMap={verifiedPrereqMap}
                    nextTargetConceptId={selectionMeta?.selectedConceptId || null}
                    selectedConceptId={selectedConceptId}
                    viewMode={graphViewMode}
                    onSelectConcept={handleSelectConcept}
                    onToggleViewMode={(mode) => setGraphViewMode(mode)}
                  />
                </div>
              </section>

              {/* Curriculum Concept Pathway Bar */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Curriculum Topological Sequence ({currentLesson.concepts.length} Nodes)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Click any concept to inspect prerequisites or focus practice
                  </span>
                </div>

                {/* Horizontal sequence of concepts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {currentLesson.concepts.map((concept) => {
                    const rawConf = confidenceMap[concept.id];
                    const isAssessed = rawConf !== undefined && rawConf !== null;
                    const isCurrent = currentQuestion?.conceptId === concept.id;
                    const isSelected = selectedConceptId === concept.id;
                    const status = getConceptStatus(rawConf, Boolean(verifiedPrereqMap[concept.id]));
                    const badge = getStatusBadgeInfo(status);

                    return (
                      <button
                        key={concept.id}
                        type="button"
                        onClick={() => setSelectedConceptId(concept.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left shrink-0 transition-all border text-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold shadow-2xs ring-2 ring-indigo-300'
                            : isSelected
                            ? 'bg-purple-50 border-purple-300 text-purple-900 font-medium'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                        title={`Inspect ${concept.name} (${isAssessed ? `${Math.round((rawConf || 0) * 100)}%` : 'Unassessed'})`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${badge.dotColor} shrink-0`} />
                        <span className="truncate max-w-[150px]">{concept.name}</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">
                          {isAssessed ? `${Math.round((rawConf || 0) * 100)}%` : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Secondary Insights & Diagnostics: Tab Switcher Hub */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setDashboardTab('analytics')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        dashboardTab === 'analytics'
                          ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Diagnostic Trajectory & Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardTab('milestones')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        dashboardTab === 'milestones'
                          ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mastery Milestones ({masteredCount}/{totalConceptsCount})
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {history.length} Attempt{history.length === 1 ? '' : 's'} Recorded
                  </span>
                </div>

                {dashboardTab === 'analytics' ? (
                  <AssessmentHistory
                    history={history}
                    concepts={currentLesson.concepts}
                  />
                ) : (
                  <MasteryMilestones
                    concepts={currentLesson.concepts}
                    confidenceMap={confidenceMap}
                    latestEvaluatedConceptId={feedback ? currentQuestion?.conceptId : null}
                    latestScoreDelta={feedback?.confidenceDelta}
                    onSelectConcept={(id) => setSelectedConceptId(id)}
                  />
                )}
              </section>
            </div>

            {/* Right Column (5 cols): Adaptive Assessment & Learning Solver */}
            <div
              className={`lg:col-span-5 xl:col-span-5 space-y-4 ${
                mobileActiveTab === 'graph' ? 'hidden lg:block' : ''
              }`}
            >
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
                onOpenAiChat={() => setIsAiChatOpen(true)}
              />
            </div>
          </div>
        )}

        {/* FULL GRAPH FOCUS VIEW */}
        {layoutMode === 'graph' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Curriculum Prerequisite Knowledge Graph
                    </h2>
                    <p className="text-xs text-slate-600">
                      Explore the foundational dependencies and mastery heatmaps across the entire curriculum.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('split')}
                    className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Return to Split Studio</span>
                  </button>
                </div>
              </div>

              {/* Expanded Graph Canvas */}
              <div className="h-[680px] w-full relative bg-slate-50">
                <KnowledgeGraph
                  concepts={currentLesson.concepts}
                  prerequisites={currentLesson.prerequisites}
                  confidenceMap={confidenceMap}
                  verifiedPrereqMap={verifiedPrereqMap}
                  nextTargetConceptId={selectionMeta?.selectedConceptId || null}
                  selectedConceptId={selectedConceptId}
                  viewMode={graphViewMode}
                  onSelectConcept={handleSelectConcept}
                  onToggleViewMode={(mode) => setGraphViewMode(mode)}
                />
              </div>
            </section>

            {/* Sequence Pathway */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Topological Concept Sequence
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {currentLesson.concepts.map((concept) => {
                  const rawConf = confidenceMap[concept.id];
                  const isAssessed = rawConf !== undefined && rawConf !== null;
                  const status = getConceptStatus(rawConf, Boolean(verifiedPrereqMap[concept.id]));
                  const badge = getStatusBadgeInfo(status);

                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => setSelectedConceptId(concept.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-left shrink-0 transition-all border text-xs bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dotColor} shrink-0`} />
                      <span className="truncate max-w-[160px]">{concept.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {isAssessed ? `${Math.round((rawConf || 0) * 100)}%` : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* FOCUSED ASSESSMENT VIEW */}
        {layoutMode === 'assessment' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Quick Diagnostic Header Bar */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-700 font-semibold">
                  Focused Diagnostic Workspace
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">•</span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Answering question directly
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsGraphSidebarOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                  title="Open Prerequisite Knowledge Graph in Sidebar"
                >
                  <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Knowledge Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('split')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Switch to Split Studio Layout"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split Studio</span>
                </button>
              </div>
            </div>

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
              onOpenAiChat={() => setIsAiChatOpen(true)}
            />
          </div>
        )}
      </main>
          </div>
        </div>
      )}

      {/* Slide-out Prerequisite Knowledge Graph Sidebar */}
      <GraphSidebar
        isOpen={isGraphSidebarOpen}
        onClose={() => setIsGraphSidebarOpen(false)}
        concepts={currentLesson.concepts}
        prerequisites={currentLesson.prerequisites}
        confidenceMap={confidenceMap}
        verifiedPrereqMap={verifiedPrereqMap}
        nextTargetConceptId={selectionMeta?.selectedConceptId || null}
        selectedConceptId={selectedConceptId}
        onSelectConcept={handleSelectConcept}
      />

      {/* Real-Time Live Voice Tutor Modal (gemini-3.1-flash-live-preview) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentQuestion={currentQuestion}
        currentConcept={currentConcept}
      />

      {/* AI Tutor Chat & Document Assistant Drawer */}
      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        topic={currentLesson.topic}
        currentQuestion={currentQuestion}
        currentConcept={currentConcept || null}
        conceptConfidence={currentConceptConfidence}
        onIngestDocumentAsCurriculum={(dataUrl, fileName, topicName) => {
          setIsAiChatOpen(false);
          handleGenerateFromPdf(dataUrl, fileName, topicName);
        }}
      />

      {/* Comprehensive Knowledge Graph Study Portal (Topic / Notes / PDF / Presets) */}
      <StudyPortalModal
        isOpen={isStudyPortalOpen}
        onClose={() => setIsStudyPortalOpen(false)}
        isLoading={isLoadingLesson}
        onSelectPreset={handleSelectPreset}
        onGenerateFromTopic={handleGenerateCustomLesson}
        onGenerateFromText={handleGenerateFromText}
        onGenerateFromPdf={handleGenerateFromPdf}
      />

      {/* Slide-out Concept Inspector Drawer */}
      <ConceptInspector
        conceptId={selectedConceptId}
        concepts={currentLesson.concepts}
        prerequisites={currentLesson.prerequisites}
        questions={currentLesson.questions}
        confidenceMap={confidenceMap}
        verifiedPrereqMap={verifiedPrereqMap}
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
