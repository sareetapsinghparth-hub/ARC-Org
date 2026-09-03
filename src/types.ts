export type ConceptMasteryStatus =
  | 'unassessed'          // Not yet assessed via student answers (no artificial 50%/40% assumptions)
  | 'mastered'            // Student answered correctly with high mastery (>= 80%)
  | 'prereq_verified'     // Prerequisite confirmed valid via downstream concept success
  | 'developing'          // Student answered partly correctly (50-79%)
  | 'prereq_gap';         // Incorrect answer or identified prerequisite gap (< 50%)

export interface GraphDiagnosticUpdate {
  targetConceptId: string;
  targetStatus: ConceptMasteryStatus;
  targetConfidence: number;
  verifiedPrereqIds: string[];
  flaggedGapPrereqIds: string[];
  reasoning: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  importance: number; // integer 1–5
  confidence?: number; // number 0–1 or undefined if unassessed
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
  graphUpdate?: GraphDiagnosticUpdate;
}

export interface LessonData {
  topic: string;
  overview: string;
  concepts: Concept[];
  prerequisites: PrerequisiteEdge[];
  questions: Question[];
  sourceType?: 'preset' | 'custom-topic' | 'custom-text' | 'pdf' | 'web-search';
  sourceName?: string;
  webSources?: Array<{ title: string; url: string }>;
}

export interface SavedLearningSession {
  id: string;
  topic: string;
  overview: string;
  sourceType: 'preset' | 'custom-topic' | 'custom-text' | 'pdf' | 'web-search';
  sourceName?: string;
  createdAt: number;
  lastActiveAt: number;
  totalConcepts: number;
  masteredCount: number;
  lessonData: LessonData;
  confidenceMap: Record<string, number | undefined>;
  verifiedPrereqMap: Record<string, boolean>;
  webSources?: Array<{ title: string; url: string }>;
}

export interface ChatAttachment {
  name: string;
  type: string; // 'application/pdf' | 'image/png' | 'text/plain' etc
  dataUrl: string; // base64 data url
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachment?: ChatAttachment;
}

export interface CurriculumInputPayload {
  topic?: string;
  presetKey?: string;
  customText?: string;
  pdfDataUrl?: string;
  pdfFileName?: string;
  isWebSearch?: boolean;
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
