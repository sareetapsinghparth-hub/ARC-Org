"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Cleans Markdown and LaTeX mathematical notation into readable, natural prose
 * so the tutor doesn't awkwardly speak raw symbols or LaTeX tags to the student.
 */
export function cleanTextForSpeech(markdown: string): string {
  let text = markdown;

  // Transform common physics formulas into natural spoken equivalents
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2");
  text = text.replace(/\\cos\s*\\theta/g, "cosine theta");
  text = text.replace(/\\sin\s*\\theta/g, "sine theta");
  text = text.replace(/\\lambda'/g, "lambda prime");
  text = text.replace(/\\lambda_0/g, "lambda zero");
  text = text.replace(/\\lambda/g, "lambda");
  text = text.replace(/\\theta/g, "theta");
  text = text.replace(/\\Delta/g, "delta");
  text = text.replace(/\\nu/g, "nu");
  text = text.replace(/\\times/g, "times");
  text = text.replace(/\\approx/g, "approximately");
  text = text.replace(/\\text\{([^}]+)\}/g, "$1");
  text = text.replace(/pm/g, "picometers");
  text = text.replace(/\$\$/g, ". ");
  text = text.replace(/\$/g, "");
  text = text.replace(/\\/g, "");

  // Clean Markdown headers, code, blockquotes, links, and formatting
  text = text.replace(/```[\s\S]*?```/g, "Code block omitted.");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/#{1,6}\s+/g, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^[-*]\s+/gm, ". ");
  text = text.replace(/^\d+\.\s+/gm, ". ");
  text = text.replace(/---/g, " ");

  // Remove multiple pauses or dots
  text = text.replace(/\.{2,}/g, ".");
  text = text.replace(/\n+/g, ". ").replace(/\s{2,}/g, " ").trim();
  return text;
}

export function useSpeechSynthesis() {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentMessageId(null);
    }
  }, []);

  const speak = useCallback(
    (text: string, messageId: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      // If already speaking this message, toggle stop
      if (isSpeaking && currentMessageId === messageId) {
        stop();
        return;
      }

      // Stop previous utterance
      window.speechSynthesis.cancel();

      const spokenText = cleanTextForSpeech(text);
      if (!spokenText) return;

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Daniel"))
        ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentMessageId(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentMessageId(null);
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("Speech synthesis error:", e);
        }
        setIsSpeaking(false);
        setCurrentMessageId(null);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, currentMessageId, stop]
  );

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    currentMessageId,
    speak,
    stop,
  };
}
