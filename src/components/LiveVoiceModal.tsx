import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  User,
  Radio,
  AlertCircle,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { floatTo16BitPCM, arrayBufferToBase64, LiveAudioPlayer } from '../utils/audioUtils';
import { Concept, Question } from '../types';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestion?: Question | null;
  currentConcept?: Concept | null;
}

export function LiveVoiceModal({
  isOpen,
  onClose,
  currentQuestion,
  currentConcept,
}: LiveVoiceModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [modelTranscript, setModelTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    { speaker: 'user' | 'model'; text: string; time: string }[]
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const isMutedRef = useRef(false);

  isMutedRef.current = isMuted;

  const startLiveSession = async () => {
    try {
      setErrorMessage(null);
      setUserTranscript('');
      setModelTranscript('');

      if (!playerRef.current) {
        playerRef.current = new LiveAudioPlayer();
      }

      // 1. Establish WebSocket connection to backend Live API proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        console.log('Connected to Gemini Live API WebSocket');

        // Send context message if a question or concept is active
        if (currentQuestion) {
          const contextIntro = `Student is currently working on the topic "${currentConcept?.name || 'Topic'}" and the question: "${currentQuestion.prompt}". Please act as their interactive Socratic voice tutor.`;
          ws.send(JSON.stringify({ text: contextIntro }));
        }

        // 2. Request mic stream and initialize 16kHz audio capture
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          mediaStreamRef.current = stream;

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const inputCtx = new AudioContextClass({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBuffer = floatTo16BitPCM(inputData);
            const base64Audio = arrayBufferToBase64(pcmBuffer);
            ws.send(JSON.stringify({ audio: base64Audio }));
          };
        } catch (micErr: any) {
          console.error('Microphone access failed:', micErr);
          setErrorMessage(
            'Microphone access denied. Please grant microphone permissions in your browser.'
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setErrorMessage(data.error);
          }

          if (data.interrupted) {
            playerRef.current?.stopAll();
            setIsSpeaking(false);
          }

          if (data.audio) {
            setIsSpeaking(true);
            playerRef.current?.playChunk(data.audio);
          }

          if (data.userTranscript) {
            setUserTranscript(data.userTranscript);
            setConversationHistory((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'user') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text} ${data.userTranscript}` },
                ];
              }
              return [
                ...prev,
                {
                  speaker: 'user',
                  text: data.userTranscript,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          }

          if (data.modelTranscript) {
            setModelTranscript(data.modelTranscript);
            setConversationHistory((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'model') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text} ${data.modelTranscript}` },
                ];
              }
              return [
                ...prev,
                {
                  speaker: 'model',
                  text: data.modelTranscript,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Live API WebSocket error:', err);
        setErrorMessage('WebSocket connection error. Please ensure GEMINI_API_KEY is configured.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsSpeaking(false);
      };
    } catch (err: any) {
      console.error('Live session initialization failed:', err);
      setErrorMessage(err?.message || 'Failed to start Live Voice session');
    }
  };

  const stopLiveSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    playerRef.current?.stopAll();
    setIsConnected(false);
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <Radio className={`w-5 h-5 ${isConnected ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">ARC Live Voice Tutor</h3>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                  gemini-3.1-flash-live-preview
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Real-time, bidirectional spoken Socratic guidance with Live API
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-live-voice-btn"
            className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Concept & Question Pill */}
        {currentQuestion && (
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 text-xs flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-indigo-700">Context:</span>
              <span className="truncate">{currentConcept?.name}: {currentQuestion.prompt}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] shrink-0 font-mono font-medium">
              Active Assessment
            </span>
          </div>
        )}

        {/* Main Interactive Stage */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-between gap-6 min-h-[280px]">
          {/* Animated Visualizer Orb */}
          <div className="relative flex items-center justify-center my-4">
            <div
              className={`w-32 h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                isSpeaking
                  ? 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/30 scale-110 animate-pulse ring-8 ring-indigo-500/10'
                  : isConnected && !isMuted
                  ? 'bg-indigo-50 border-2 border-indigo-400/50 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-100 border border-slate-300'
              }`}
            >
              <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center text-center p-2 shadow-xs">
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-8 h-8 text-indigo-600 animate-bounce" />
                    <span className="text-[10px] font-mono text-indigo-700 mt-1 font-semibold">Tutor Speaking</span>
                  </>
                ) : isConnected && !isMuted ? (
                  <>
                    <Mic className="w-8 h-8 text-indigo-600 animate-pulse" />
                    <span className="text-[10px] font-mono text-indigo-700 mt-1 font-medium">Listening...</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-8 h-8 text-slate-400" />
                    <span className="text-[10px] font-mono text-slate-400 mt-1">Muted</span>
                  </>
                )}
              </div>
            </div>

            {/* Ripple rings when active */}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/40 animate-ping pointer-events-none" />
                <div className="absolute -inset-4 rounded-full border border-indigo-300/30 animate-pulse pointer-events-none" />
              </>
            )}
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Real-time Subtitles / Live Transcript Box */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[110px] flex flex-col justify-end space-y-2">
            <div className="text-[11px] font-mono text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                Live Conversation Stream
              </span>
              <span className="text-[10px] text-slate-400">Live API 16kHz PCM duplex</span>
            </div>

            {conversationHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Speak into your microphone to start discussing the problem with ARC...
              </p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs">
                {conversationHistory.slice(-4).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      msg.speaker === 'user' ? 'text-slate-700' : 'text-indigo-900 font-medium'
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-400 shrink-0 mt-0.5">
                      {msg.speaker === 'user' ? 'You:' : 'ARC:'}
                    </span>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              id="toggle-live-mic-btn"
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
            </button>

            {isSpeaking && (
              <button
                onClick={() => {
                  playerRef.current?.stopAll();
                  setIsSpeaking(false);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Interrupt / Stop AI Speech"
              >
                <VolumeX className="w-4 h-4 text-amber-600" />
                <span>Interrupt</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isConnected) {
                  stopLiveSession();
                } else {
                  startLiveSession();
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isConnected
                  ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect Live'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
