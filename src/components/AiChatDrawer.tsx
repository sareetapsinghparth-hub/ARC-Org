import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  ChatAttachment,
  Question,
  Concept,
} from '../types';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Paperclip,
  FileText,
  FileUp,
  RotateCcw,
  Bot,
  User,
  Lightbulb,
  HelpCircle,
  Loader2,
  Trash2,
  ArrowRight,
} from 'lucide-react';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  currentQuestion: Question | null;
  currentConcept: Concept | null;
  conceptConfidence: number;
  onIngestDocumentAsCurriculum?: (dataUrl: string, fileName: string, topicName: string) => void;
}

export function AiChatDrawer({
  isOpen,
  onClose,
  topic,
  currentQuestion,
  currentConcept,
  conceptConfidence,
  onIngestDocumentAsCurriculum,
}: AiChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: `Hello! I'm your ARC AI Tutor. I can help you understand **${topic}**, provide hints for active diagnostic questions, or analyze notes and PDF documents you share. What would you like to explore?`,
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend ?? inputPrompt;
    if ((!text.trim() && !attachment) || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      attachment: attachment || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    const currentAtt = attachment;
    setAttachment(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachment: m.attachment,
          })),
          attachment: currentAtt,
          context: {
            topic,
            conceptName: currentConcept?.name,
            confidence: conceptConfidence,
            questionPrompt: currentQuestion?.prompt,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const replyContent = data.reply || "I've analyzed your question. Let's work through the concept together!";

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: replyContent,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: `I encountered an issue connecting to the AI Tutor. Please try again in a moment.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setAttachment({
            name: file.name,
            type: file.type || 'application/pdf',
            dataUrl,
            size: file.size,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const quickPrompts = [
    { label: '💡 Hint on this question', prompt: 'Can you give me a subtle hint for the current question without giving away the final answer?' },
    { label: '📖 Explain concept simply', prompt: `Can you explain ${currentConcept?.name || 'this concept'} in simple, intuitive terms with an analogy?` },
    { label: '📐 Step-by-step derivation', prompt: `Can you walk through the step-by-step mathematical reasoning behind ${currentConcept?.name || 'this topic'}?` },
    { label: '❓ Common student mistakes', prompt: `What are the most frequent pitfalls and misconceptions students face with ${currentConcept?.name || 'this concept'}?` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white border-l border-slate-200 w-full max-w-lg h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">ARC AI Tutor</h3>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                {currentConcept ? `Target: ${currentConcept.name}` : topic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome-reset',
                    role: 'model',
                    content: `Chat cleared. Ready for your next question or document on **${topic}**!`,
                    timestamp: Date.now(),
                  },
                ])
              }
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {msg.role === 'model' ? (
                  <>
                    <Bot className="w-3 h-3 text-indigo-600" />
                    <span className="text-[10px] text-slate-500 font-semibold">ARC Tutor</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-500 font-semibold">You</span>
                    <User className="w-3 h-3 text-indigo-600" />
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {/* Attached File Preview inside bubble */}
                {msg.attachment && (
                  <div className="mb-2 p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-mono text-[11px] truncate text-slate-800">
                        {msg.attachment.name}
                      </span>
                    </div>

                    {onIngestDocumentAsCurriculum && (
                      <button
                        type="button"
                        onClick={() =>
                          onIngestDocumentAsCurriculum(
                            msg.attachment!.dataUrl,
                            msg.attachment!.name,
                            msg.attachment!.name.replace(/\.[^/.]+$/, '')
                          )
                        }
                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded shrink-0 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                        title="Generate learning graph from this document"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Build Graph</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-slate-500 text-xs px-2 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>ARC Tutor is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Pills */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isSending}
              className="text-[11px] bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-200 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Attachment Bar (if file staged) */}
        {attachment && (
          <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-mono text-indigo-950 truncate font-semibold">{attachment.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({attachment.size ? (attachment.size / 1024).toFixed(1) + ' KB' : 'ready'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-rose-600 hover:text-rose-700 text-xs ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Field & Send Controls */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
              title="Attach PDF, notes text, or problem screenshot"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="flex-1 bg-white border border-slate-200 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 rounded-xl px-3 py-2 transition-colors">
              <textarea
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about a derivation, request a hint, or discuss your document..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={(!inputPrompt.trim() && !attachment) || isSending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-40 cursor-pointer shrink-0"
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
