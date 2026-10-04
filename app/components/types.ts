export interface Source {
  source: string;
  page: number;
}

export interface ImageAnalysis {
  detected_content?: string;
  extracted_question?: string;
}

export interface KeyMoment {
  timestamp: string;
  seconds?: number;
  description: string;
}

export interface VideoAnalysis {
  summary?: string;
  detected_topics?: string[];
  key_moments?: KeyMoment[];
}

export interface Message {
  id: string;
  role: "student" | "tutor";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  imageAnalysis?: ImageAnalysis;
  videoAnalysis?: VideoAnalysis;
  sources?: Source[];
  timestamp: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

