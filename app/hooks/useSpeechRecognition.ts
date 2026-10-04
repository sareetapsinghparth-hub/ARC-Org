"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API Types
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscriptChange?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export function useSpeechRecognition({
  lang = "en-US",
  onTranscriptChange,
  onFinalTranscript,
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    // If already listening, stop
    if (isListening && recognitionRef.current) {
      stopListening();
      return;
    }

    setError(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          onTranscriptChange?.(combined);
          if (finalTranscript.trim()) {
            onFinalTranscript?.(finalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError(
            "Microphone access was denied. Please allow microphone permissions in your browser settings."
          );
        } else if (event.error === "no-speech") {
          setError("No speech was detected. Please try speaking again.");
        } else if (event.error === "audio-capture") {
          setError("No microphone hardware found on your device.");
        } else if (event.error === "network") {
          setError("Network error occurred during speech recognition.");
        } else if (event.error !== "aborted") {
          setError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Could not start speech recognition: ${msg}`);
      setIsListening(false);
    }
  }, [lang, isListening, onTranscriptChange, onFinalTranscript, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null),
  };
}
