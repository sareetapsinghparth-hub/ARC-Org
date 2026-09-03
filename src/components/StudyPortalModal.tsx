import React, { useState, useRef } from 'react';
import { DEFAULT_CURRICULA } from '../data/defaultCurricula';
import {
  Sparkles,
  FileText,
  Upload,
  BookOpen,
  X,
  Loader2,
  FileUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BrainCircuit,
  Layers,
} from 'lucide-react';

interface StudyPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  onSelectPreset: (key: string) => void;
  onGenerateFromTopic: (topic: string) => void;
  onGenerateFromText: (text: string, topicName: string) => void;
  onGenerateFromPdf: (pdfDataUrl: string, fileName: string, topicName: string) => void;
}

type TabMode = 'topic' | 'text' | 'pdf' | 'presets';

export function StudyPortalModal({
  isOpen,
  onClose,
  isLoading,
  onSelectPreset,
  onGenerateFromTopic,
  onGenerateFromText,
  onGenerateFromPdf,
}: StudyPortalModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('topic');

  // Topic input state
  const [topicInput, setTopicInput] = useState('');

  // Raw text input state
  const [textInput, setTextInput] = useState('');
  const [textTopicName, setTextTopicName] = useState('');

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<{ name: string; size: number; dataUrl: string } | null>(null);
  const [pdfTopicName, setPdfTopicName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Preset topics list
  const presetKeys = Object.keys(DEFAULT_CURRICULA);

  // Suggested quick topics
  const suggestedTopics = [
    'Calculus: Derivatives & Chain Rule',
    'Neural Networks & Backpropagation',
    'Linear Algebra: Eigenvalues & Transformations',
    'Quantum Mechanics: Wavefunctions & Operators',
    'Algorithms: Graphs, Trees & Dynamic Programming',
    'Organic Chemistry: Reaction Mechanisms',
    'Thermodynamics: Entropy & State Equations',
    'Microeconomics: Elasticity & Market Equilibrium',
  ];

  const handleFileProcess = (file: File) => {
    setFileError(null);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setFileError('Please select a PDF document (.pdf) or text file (.txt, .md).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFileError('File size exceeds 15MB limit. Please upload a smaller excerpt.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setPdfFile({
          name: file.name,
          size: file.size,
          dataUrl,
        });
        if (!pdfTopicName) {
          // Auto-derive readable topic from file name
          const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
          setPdfTopicName(cleanName);
        }
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim() || isLoading) return;
    onGenerateFromTopic(topicInput.trim());
    onClose();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLoading) return;
    const name = textTopicName.trim() || 'Custom Study Notes';
    onGenerateFromText(textInput.trim(), name);
    onClose();
  };

  const handlePdfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || isLoading) return;
    const name = pdfTopicName.trim() || pdfFile.name.replace(/\.[^/.]+$/, '');
    onGenerateFromPdf(pdfFile.dataUrl, pdfFile.name, name);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Knowledge Graph Study Portal
              </h2>
              <p className="text-xs text-slate-500">
                Input any topic, paste notes, upload a PDF, or pick from our curated curriculum library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('topic')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'topic'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enter Topic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Notes / Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Curriculum Library ({presetKeys.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Enter Topic */}
          {activeTab === 'topic' && (
            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Subject or Target Topic
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Linear Algebra, Quantum Mechanics, Microeconomics, Organic Synthesis..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  ARC uses Gemini 3.8 Flash to synthesize a complete prerequisite graph, core concept nodes, and multi-tier diagnostic questions.
                </p>
              </div>

              {/* Quick Select Suggested Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-2 uppercase tracking-wider">
                  Popular Suggested Subjects:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTopics.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopicInput(t)}
                      className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors text-left cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!topicInput.trim() || isLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Graph...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Knowledge Graph</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Paste Raw Study Notes / Text */}
          {activeTab === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Study Unit / Topic Title (Optional)
                </label>
                <input
                  type="text"
                  value={textTopicName}
                  onChange={(e) => setTextTopicName(e.target.value)}
                  placeholder="e.g. Chapter 4: Photosynthesis & Calvin Cycle"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Paste Study Material, Lecture Notes, or Syllabus
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {textInput.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste textbook summaries, lecture notes, formula sheets, or study guide text here. ARC will read through every paragraph, extract the key concepts and prerequisite dependencies, and generate custom practice questions..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none resize-none leading-relaxed font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!textInput.trim() || isLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deconstructing Notes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Deconstruct & Build Graph</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Upload PDF / Document */}
          {activeTab === 'pdf' && (
            <form onSubmit={handlePdfSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={pdfTopicName}
                  onChange={(e) => setPdfTopicName(e.target.value)}
                  placeholder="e.g. Fluid Mechanics Lecture 3"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : pdfFile
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                {pdfFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{pdfFile.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB PDF ready for model ingestion
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      className="mt-2 text-xs text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      Remove and choose another file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click or drag & drop your PDF document here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports PDF files (.pdf) or text documents (.txt, .md) up to 15MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">How PDF Ingestion Works:</strong> Gemini 3.8 Flash ingests your full PDF document, extracts structural sections, parses definitions and formulas, constructs a prerequisite dependency network (DAG), and invents targeted assessment questions matching your exact course material.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pdfFile || isLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ingesting PDF & Generating Graph...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Ingest PDF into Model</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Curated Presets Library */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose any pre-curated, rigorous curriculum across mathematics, computer science, and physics:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presetKeys.map((key) => {
                  const preset = DEFAULT_CURRICULA[key];
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        onSelectPreset(key);
                        onClose();
                      }}
                      className="bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 p-4 rounded-xl cursor-pointer transition-all group flex flex-col justify-between space-y-2 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {preset.topic}
                          </h4>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md shrink-0 font-medium">
                            {preset.concepts.length} Nodes
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {preset.overview}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-indigo-700 group-hover:text-indigo-800 font-semibold">
                        <span>{preset.questions.length} Diagnostic Qs</span>
                        <div className="flex items-center gap-1">
                          <span>Load Curriculum</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
