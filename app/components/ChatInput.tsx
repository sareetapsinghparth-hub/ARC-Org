"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  AlertCircle,
  Radio,
  X,
  ImageIcon,
  Video,
} from "lucide-react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface ChatInputProps {
  onSendMessage: (
    message: string,
    imageFile?: File | null,
    imagePreviewUrl?: string | null,
    videoFile?: File | null,
    videoPreviewUrl?: string | null
  ) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook for Web Speech API Speech-to-Text
  const {
    isSupported: isSpeechSupported,
    isListening,
    error: speechError,
    startListening,
    stopListening,
    clearError,
  } = useSpeechRecognition({
    lang: "en-US",
    onTranscriptChange: (text) => {
      setInput(text);
      setVoiceNotice(`You said: "${text}"`);
    },
    onFinalTranscript: (finalText) => {
      setInput(finalText);
      setVoiceNotice(`Voice captured: "${finalText}". You can review or edit before sending.`);
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [imagePreviewUrl, videoPreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    const isImage =
      ALLOWED_IMAGE_TYPES.includes(fileType) ||
      /\.(png|jpe?g|webp)$/i.test(fileName);

    const isVideo =
      ALLOWED_VIDEO_TYPES.includes(fileType) ||
      /\.(mp4|webm|mov)$/i.test(fileName);

    if (isImage) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        showToast("Image exceeds 15MB limit. Please select a smaller image.");
        e.target.value = "";
        return;
      }

      // Cleanup prior media
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setSelectedVideo(null);
      setVideoPreviewUrl(null);

      const previewUrl = URL.createObjectURL(file);
      setSelectedImage(file);
      setImagePreviewUrl(previewUrl);
    } else if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        showToast("Video exceeds 50MB limit. Please upload a clip under 50MB.");
        e.target.value = "";
        return;
      }

      // Cleanup prior media
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setSelectedImage(null);
      setImagePreviewUrl(null);

      const previewUrl = URL.createObjectURL(file);
      setSelectedVideo(file);
      setVideoPreviewUrl(previewUrl);
    } else {
      showToast("Unsupported format. Please upload an image (PNG, JPG) or video (MP4, WebM, MOV).");
    }

    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage && !selectedVideo) || disabled) return;

    if (isListening) {
      stopListening();
    }

    onSendMessage(trimmed, selectedImage, imagePreviewUrl, selectedVideo, videoPreviewUrl);

    setInput("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    setVoiceNotice(null);
    clearError();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (!isSpeechSupported) {
      showToast("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      clearError();
      setVoiceNotice(null);
      startListening();
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const canSubmit = Boolean(input.trim() || selectedImage || selectedVideo) && !disabled;

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Hidden File Input for Image or Video Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4, video/webm, video/quicktime, .mp4, .webm, .mov"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Toast notifications */}
      {toastMessage && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-300 shadow-xl flex items-center gap-2 animate-fadeIn z-20 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Speech error notification banner */}
      {speechError && (
        <div className="mb-2 px-3.5 py-2 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={clearError}
            className="text-[11px] font-semibold text-red-300 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Voice Listening Banner */}
      {isListening && (
        <div className="mb-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="font-semibold text-emerald-300">Listening to your question...</span>
            <span className="text-emerald-400/80 hidden sm:inline">Speak clearly into your microphone</span>
          </div>
          <button
            onClick={stopListening}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-medium text-emerald-300 transition-colors"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Voice Review Helper Notice */}
      {!isListening && voiceNotice && (
        <div className="mb-2 px-3.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[12px] text-zinc-300 flex items-center justify-between gap-2">
          <span className="truncate italic text-zinc-300">{voiceNotice}</span>
          <button
            onClick={() => setVoiceNotice(null)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Image Preview Banner (Before Sending) */}
      {selectedImage && imagePreviewUrl && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-zinc-900/95 border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black border border-zinc-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Physics Image Attached</span>
              </div>
              <p className="text-[11px] text-zinc-300 truncate max-w-xs sm:max-w-md">
                {selectedImage.name} ({(selectedImage.size / 1024).toFixed(0)} KB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            title="Remove image"
            aria-label="Remove image"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Video Preview Banner (Before Sending) */}
      {selectedVideo && videoPreviewUrl && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-zinc-900/95 border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black border border-zinc-800 shrink-0">
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <Video className="w-3.5 h-3.5" />
                <span>Physics Video Attached (Max 50MB)</span>
              </div>
              <p className="text-[11px] text-zinc-300 truncate max-w-xs sm:max-w-md">
                {selectedVideo.name} ({(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveVideo}
            title="Remove video"
            aria-label="Remove video"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        className={`relative rounded-2xl border bg-zinc-900/90 shadow-xl shadow-black/40 transition-all ${
          isListening
            ? "border-emerald-500 ring-2 ring-emerald-500/20"
            : selectedImage || selectedVideo
            ? "border-emerald-500/60 ring-2 ring-emerald-500/10"
            : "border-zinc-800 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10"
        }`}
      >
        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "Listening... (your words will appear here)"
              : selectedVideo
              ? "Ask ReasonLens about this video lecture (or press send for complete explanation)..."
              : selectedImage
              ? "Ask ReasonLens about this image (or press send to explain it)..."
              : "Ask ReasonLens a physics concept, formula, or derivation..."
          }
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-zinc-100 placeholder-zinc-500 outline-none leading-relaxed min-h-[48px] max-h-[160px]"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Unified Media Attachment Button (Images & Videos) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach physics image (PNG/JPG max 15MB) or video lecture (MP4/WebM/MOV max 50MB)"
              aria-label="Attach physics media"
              className={`p-2 rounded-lg transition-colors ${
                selectedImage || selectedVideo
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Microphone Button (Voice Tutor Input) */}
            <button
              type="button"
              onClick={handleMicClick}
              title={isListening ? "Stop listening" : "Ask by voice (Speech recognition)"}
              aria-label={isListening ? "Stop listening" : "Ask by voice"}
              className={`p-2 rounded-lg transition-all ${
                isListening
                  ? "bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-950/50 scale-105"
                  : "text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80"
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <span className="text-[11px] text-zinc-500 ml-1 hidden sm:inline">
              {isListening ? (
                <span className="text-emerald-400 font-medium">Recording speech...</span>
              ) : selectedVideo ? (
                <span className="text-emerald-400 font-medium">Video lecture attached</span>
              ) : selectedImage ? (
                <span className="text-emerald-400 font-medium">Image ready to send</span>
              ) : (
                "SMS1001 Engineering Physics active"
              )}
            </span>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSubmit}
            aria-label="Send question to tutor"
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-all shadow-sm"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-zinc-500">
        ReasonLens grounds answers in official Engineering Physics course material. Type, speak, or upload problem images &amp; video lectures (max 50MB).
      </p>
    </div>
  );
}
