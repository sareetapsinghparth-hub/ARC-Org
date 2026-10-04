"use client";

import React, { useState } from "react";
import {
  User,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Volume2,
  Square,
  ImageIcon,
  Video,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Message } from "./types";
import { TutorResponse } from "./TutorResponse";

interface MessageBubbleProps {
  message: Message;
  onFollowUpClick?: (prompt: string) => void;
  onRetry?: () => void;
  isSpeaking?: boolean;
  onSpeakToggle?: (text: string, id: string) => void;
  isSpeechSupported?: boolean;
}

export function MessageBubble({
  message,
  onFollowUpClick,
  onRetry,
  isSpeaking = false,
  onSpeakToggle,
  isSpeechSupported = true,
}: MessageBubbleProps) {
  const [showImageDetails, setShowImageDetails] = useState(false);
  const [showVideoDetails, setShowVideoDetails] = useState(true);
  const isStudent = message.role === "student";

  const handleSeekVideo = (seconds?: number) => {
    if (seconds === undefined) return;
    const videos = document.querySelectorAll("video");
    if (videos.length > 0) {
      // Seek the last student video player on the page
      const targetVideo = videos[videos.length - 1];
      targetVideo.currentTime = seconds;
      targetVideo.play().catch(() => {});
      targetVideo.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (isStudent) {
    return (
      <div className="flex justify-end gap-3 max-w-3xl ml-auto py-2">
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">You (Student)</span>
            <span>·</span>
            <span>{message.timestamp}</span>
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white text-[15px] leading-relaxed shadow-md shadow-blue-950/20 space-y-2.5">
            {/* Student Uploaded Image */}
            {message.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/20 bg-black/40 max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.imageUrl}
                  alt="Student uploaded problem"
                  className="max-h-64 w-full object-contain"
                />
              </div>
            )}

            {/* Student Uploaded Video */}
            {message.videoUrl && (
              <div className="rounded-xl overflow-hidden border border-white/20 bg-black max-w-sm sm:max-w-md w-full shadow-lg">
                <video
                  src={message.videoUrl}
                  controls
                  playsInline
                  className="w-full max-h-64 object-contain bg-black"
                />
              </div>
            )}

            {message.content ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.videoUrl ? (
              <p className="text-xs text-blue-100/90 italic flex items-center gap-1.5 pt-0.5">
                <Video className="w-3.5 h-3.5" />
                <span>Uploaded Physics Video Lecture</span>
              </p>
            ) : message.imageUrl ? (
              <p className="text-xs text-blue-100/90 italic flex items-center gap-1.5 pt-0.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Uploaded Physics Problem Image</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-6 text-indigo-300">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Tutor Message
  return (
    <div className="flex gap-3.5 max-w-3xl mr-auto py-3 w-full">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-emerald-950/30 text-emerald-400">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400">ReasonLens</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400/90 text-[10px] font-medium border border-emerald-500/20">
              Physics Tutor
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500">{message.timestamp}</span>
          </div>

          {/* Voice Text-to-Speech Control */}
          {!message.isError && onSpeakToggle && (
            <button
              onClick={() => onSpeakToggle(message.content, message.id)}
              disabled={!isSpeechSupported}
              title={
                !isSpeechSupported
                  ? "Speech synthesis is not supported in this browser"
                  : isSpeaking
                  ? "Stop reading aloud"
                  : "Read tutor explanation aloud (Text-to-Speech)"
              }
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isSpeaking
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800"
              } ${!isSpeechSupported ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  <span>Stop reading</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-zinc-400" />
                  <span>Read aloud</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Video Lecture Analysis & Key Timestamps Card if present */}
        {message.videoAnalysis && (
          <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 text-xs text-zinc-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Video className="w-4 h-4 shrink-0" />
                <span>Video Lecture Analysis &amp; Timestamps</span>
              </div>
              <button
                onClick={() => setShowVideoDetails((prev) => !prev)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <span>{showVideoDetails ? "Hide key moments" : "View key moments"}</span>
                {showVideoDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {message.videoAnalysis.summary && (
              <p className="text-zinc-300 leading-relaxed text-[12px]">
                {message.videoAnalysis.summary}
              </p>
            )}

            {message.videoAnalysis.detected_topics && message.videoAnalysis.detected_topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {message.videoAnalysis.detected_topics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-emerald-300/90 text-[10px] font-medium border border-zinc-700/60"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {showVideoDetails && message.videoAnalysis.key_moments && message.videoAnalysis.key_moments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1.5">
                <p className="text-[11px] text-zinc-400 font-medium mb-1">
                  Click a timestamp to jump to that moment in the video:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {message.videoAnalysis.key_moments.map((km, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSeekVideo(km.seconds)}
                      className="flex items-start gap-2 p-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold shrink-0 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        {km.timestamp}
                      </span>
                      <span className="text-[11px] text-zinc-300 line-clamp-1 group-hover:text-zinc-100">
                        {km.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detected Image Content Card if present */}
        {message.imageAnalysis && message.imageAnalysis.detected_content && (
          <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Eye className="w-3.5 h-3.5" />
                <span>Image Analysis &amp; Concept Extraction</span>
              </div>
              <button
                onClick={() => setShowImageDetails((prev) => !prev)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <span>{showImageDetails ? "Hide details" : "View detected text"}</span>
                {showImageDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {message.imageAnalysis.extracted_question && (
              <p className="text-zinc-200">
                <strong className="text-zinc-400 font-normal">Identified Problem:</strong>{" "}
                {message.imageAnalysis.extracted_question}
              </p>
            )}
            {showImageDetails && (
              <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 whitespace-pre-wrap font-mono bg-zinc-900/50 p-2 rounded">
                {message.imageAnalysis.detected_content}
              </div>
            )}
          </div>
        )}

        {message.isError ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-300 mb-1">Tutor Explanation Error</p>
                <p className="text-xs text-red-300/80 leading-relaxed">{message.content}</p>
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-xs text-red-200 transition-colors font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Question</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm bg-zinc-900/80 border border-zinc-800/90 p-5 shadow-sm">
            <TutorResponse
              content={message.content}
              sources={message.sources}
              onFollowUpClick={onFollowUpClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
