"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { TutorHeader } from "./TutorHeader";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { LoadingState } from "./LoadingState";
import { WelcomeHero } from "./WelcomeHero";
import { Conversation, Message } from "./types";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

const BACKEND_URL = "http://127.0.0.1:8000";

const INITIAL_CONVERSATION: Conversation = {
  id: "session-1",
  title: "Engineering Physics Tutoring",
  createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  messages: [],
};

export function TutorChat() {
  const [conversations, setConversations] = useState<Conversation[]>([INITIAL_CONVERSATION]);
  const [activeConversationId, setActiveConversationId] = useState<string>("session-1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Hook for Text-to-Speech reading of tutor responses
  const {
    isSpeaking,
    currentMessageId,
    speak,
    stop: stopSpeaking,
    isSupported: isTtsSupported,
  } = useSpeechSynthesis();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active conversation
  const currentConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation]);

  // Check backend health periodically
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { method: "GET" });
        setBackendHealthy(res.ok);
      } catch {
        setBackendHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    stopSpeaking();
    const newId = `session-${Date.now()}`;
    const newChat: Conversation = {
      id: newId,
      title: "New Physics Discussion",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: [],
    };
    setConversations((prev) => [newChat, ...prev]);
    setActiveConversationId(newId);
  };

  const handleSendMessage = async (
    questionText: string,
    imageFile?: File | null,
    imagePreviewUrl?: string | null,
    videoFile?: File | null,
    videoPreviewUrl?: string | null
  ) => {
    const hasText = Boolean(questionText && questionText.trim());
    const hasImage = Boolean(imageFile);
    const hasVideo = Boolean(videoFile);
    if ((!hasText && !hasImage && !hasVideo) || isLoading) return;

    stopSpeaking();

    const studentMessage: Message = {
      id: `msg-${Date.now()}-student`,
      role: "student",
      content: questionText.trim(),
      imageUrl: imagePreviewUrl || undefined,
      videoUrl: videoPreviewUrl || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update conversation title if first message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const isFirst = c.messages.length === 0;
          const title = hasText
            ? questionText.slice(0, 36) + (questionText.length > 36 ? "..." : "")
            : hasVideo
            ? "Physics Video Lecture"
            : "Physics Diagram / Problem";
          return {
            ...c,
            title: isFirst ? title : c.title,
            messages: [...c.messages, studentMessage],
          };
        }
        return c;
      })
    );

    setIsLoading(true);
    setIsImageLoading(hasImage);
    setIsVideoLoading(hasVideo);

    try {
      let response: Response;

      if (hasVideo && videoFile) {
        // Video upload flow -> POST /ask-video
        const formData = new FormData();
        formData.append("video", videoFile);
        if (hasText) {
          formData.append("question", questionText.trim());
        }
        response = await fetch(`${BACKEND_URL}/ask-video`, {
          method: "POST",
          body: formData,
        });
      } else if (hasImage && imageFile) {
        // Multimodal image upload flow -> POST /ask-image
        const formData = new FormData();
        formData.append("image", imageFile);
        if (hasText) {
          formData.append("question", questionText.trim());
        }
        response = await fetch(`${BACKEND_URL}/ask-image`, {
          method: "POST",
          body: formData,
        });
      } else {
        // Standard text flow -> POST /ask
        response = await fetch(`${BACKEND_URL}/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: questionText.trim(),
          }),
        });
      }

      if (!response.ok) {
        let errorDetail = "Server responded with an error.";
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || errorDetail;
        } catch {
          errorDetail = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();

      const tutorMessage: Message = {
        id: `msg-${Date.now()}-tutor`,
        role: "tutor",
        content: data.answer || "No answer generated by tutor.",
        sources: data.sources || [],
        imageAnalysis: data.image_analysis || undefined,
        videoAnalysis: data.video_analysis || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [...c.messages, tutorMessage],
            };
          }
          return c;
        })
      );
      setBackendHealthy(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while communicating with ReasonLens.";

      const errorTutorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "tutor",
        content: errorMessage,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [...c.messages, errorTutorMessage],
            };
          }
          return c;
        })
      );
    } finally {
      setIsLoading(false);
      setIsImageLoading(false);
      setIsVideoLoading(false);
    }
  };

  const handleRetry = () => {
    const lastStudentMsg = [...messages].reverse().find((m) => m.role === "student");
    if (lastStudentMsg) {
      handleSendMessage(lastStudentMsg.content);
    }
  };

  return (
    <div className="flex h-screen bg-[#090a0f] text-zinc-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        backendHealthy={backendHealthy}
      />

      {/* Main Tutor Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#090a0f] relative">
        <TutorHeader
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          backendHealthy={backendHealthy}
        />

        {/* Scrollable Conversation Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="max-w-3xl mx-auto w-full min-h-full flex flex-col justify-between">
            {messages.length === 0 ? (
              <WelcomeHero onSelectPrompt={handleSendMessage} />
            ) : (
              <div className="space-y-4 w-full">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onFollowUpClick={handleSendMessage}
                    onRetry={handleRetry}
                    isSpeaking={isSpeaking && currentMessageId === message.id}
                    onSpeakToggle={speak}
                    isSpeechSupported={isTtsSupported}
                  />
                ))}

                {isLoading && (
                  <LoadingState isImage={isImageLoading} isVideo={isVideoLoading} />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/95 to-transparent border-t border-zinc-800/40">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
