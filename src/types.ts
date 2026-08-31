export interface Concept {
  id: string;
  name: string;
  description: string;
  importance: number; // integer 1–5
  confidence: number; // number 0–1 (default 0.5)
}

export interface PrerequisiteEdge {
  id?: string;
  source: string; // prerequisite concept id (from)
  target: string; // dependent concept id (to)
  relation?: string;
}

export interface Question {
  id: string;
  conceptId: string;
  conceptName: string;
  prompt: string;
  context?: string;
  difficulty: 'foundational' | 'intermediate' | 'advanced';
  rubricKeyPoints?: string[];
  sampleSolution?: string;
  isPrerequisiteCheck?: boolean;
  targetPrerequisiteOf?: string;
}

export interface AnswerAnalysisResult {
  status: 'correct' | 'partly correct' | 'incorrect';
  score: number; // 0.0 to 1.0
  misconception: string;
  feedback: string;
  recommendedAction: string;
  writtenStepsAnalysis?: string;
  consistencyNotes?: string;
  confidenceDelta?: number;
  newConfidence?: number;
}

export interface LessonData {
  topic: string;
  overview: string;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  questions: Question[];
}

export interface SelectedImageInfo {
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

export interface AssessmentHistoryItem {
  id: string;
  timestamp: number;
  question: Question;
  studentAnswer: string;
  imageAttached: boolean;
  result: AnswerAnalysisResult;
  previousConfidence: number;
  newConfidence: number;
}

export interface AdaptiveSelectionMeta {
  selectedConceptId: string;
  selectedConceptName: string;
  reason: string;
  isPrerequisiteIntervention: boolean;
  prerequisiteFor?: string;
  conceptConfidence: number;
}

export type SessionPacing = 'rapid' | 'standard' | 'comprehensive';
