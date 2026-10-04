"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Source } from "./types";
import { SourceList } from "./SourceList";

interface TutorResponseProps {
  content: string;
  sources?: Source[];
  onFollowUpClick?: (prompt: string) => void;
}

export function TutorResponse({ content, sources, onFollowUpClick }: TutorResponseProps) {
  return (
    <div className="space-y-4">
      {/* Markdown Body */}
      <div className="prose prose-invert max-w-none text-zinc-200 text-[15px] leading-7 font-normal">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-zinc-800 flex items-center gap-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold text-emerald-300 mt-5 mb-2.5 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-emerald-400 inline-block" />
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-2 tracking-wide uppercase text-xs text-zinc-400 border-l-2 border-emerald-500/50 pl-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-3.5 text-zinc-200/90 leading-relaxed last:mb-0">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside pl-5 space-y-1.5 mb-3.5 text-zinc-200/90">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside pl-5 space-y-1.5 mb-3.5 text-zinc-200/90 marker:text-emerald-400 marker:font-semibold">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="pl-1 leading-relaxed">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-emerald-500/60 bg-emerald-950/20 px-4 py-2 rounded-r-lg my-3 text-zinc-300 italic">
                {children}
              </blockquote>
            ),
            code: ({ children, ...props }) => {
              const isInline = !String(children).includes("\n");
              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-mono text-xs border border-zinc-700/60"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <div className="my-3 rounded-lg bg-zinc-950 border border-zinc-800 p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-zinc-200" {...props}>
                    {children}
                  </code>
                </div>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold text-white">{children}</strong>
            ),
            hr: () => <hr className="my-5 border-zinc-800/80" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Sources from Course Material */}
      {sources && sources.length > 0 && <SourceList sources={sources} />}

      {/* Interactive Tutor Follow-up Suggestions */}
      {onFollowUpClick && (
        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mr-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Suggested follow-up:</span>
          </div>
          <button
            onClick={() => onFollowUpClick("Can you break down the mathematical derivation step-by-step?")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 text-xs text-zinc-300 transition-colors"
          >
            <span>Break down the derivation</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </button>
          <button
            onClick={() => onFollowUpClick("Give me a practical numerical example based on this.")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 text-xs text-zinc-300 transition-colors"
          >
            <span>Show a numerical example</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </button>
          <button
            onClick={() => onFollowUpClick("Quiz me with a short question to test my understanding.")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 text-xs text-zinc-300 transition-colors"
          >
            <span>Quiz my understanding</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      )}
    </div>
  );
}
