import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';

interface AudioTranscribeButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export function AudioTranscribeButton({
  onTranscriptionComplete,
  disabled = false,
}: AudioTranscribeButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setTranscriptionStatus('idle');
      setRecordingSeconds(0);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone recording is not supported in this browser or environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Select supported audio MIME type across Chrome, Safari, Firefox, Edge
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg',
          'audio/wav',
        ];
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate)) {
            mimeType = candidate;
            break;
          }
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      const activeMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks cleanly
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setErrorMessage('No audio data recorded.');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: activeMimeType });
        await handleTranscribeBlob(audioBlob, activeMimeType);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access.'
          : 'Microphone is unavailable or unsupported in this browser.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTranscribeBlob = async (blob: Blob, mimeType: string) => {
    try {
      setIsTranscribing(true);

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio: base64Data,
              mimeType,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          if (data.transcription && data.transcription.trim().length > 0) {
            onTranscriptionComplete(data.transcription.trim());
            setTranscriptionStatus('success');
            setTimeout(() => setTranscriptionStatus('idle'), 3500);
          } else {
            setErrorMessage('No clear speech was detected. Please speak closer to the microphone and try again.');
            setTranscriptionStatus('error');
            setTimeout(() => setTranscriptionStatus('idle'), 4000);
          }
        } catch (apiErr: any) {
          console.error('Transcription API error:', apiErr);
          setErrorMessage(apiErr?.message || 'Transcription failed.');
          setTranscriptionStatus('error');
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error('Error handling audio blob:', err);
      setErrorMessage(err?.message || 'Failed to process audio.');
      setIsTranscribing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            id="voice-transcribe-record-btn"
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            title="Dictate your response using Gemini 3.5 Transcribe"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dictate Answer</span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
              gemini-3.5-transcribe
            </span>
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            id="voice-transcribe-stop-btn"
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-pulse cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop ({formatSeconds(recordingSeconds)})</span>
          </button>
        )}

        {isTranscribing && (
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs flex items-center gap-2 animate-pulse font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Transcribing with gemini-3.5-transcribe...</span>
          </div>
        )}

        {transcriptionStatus === 'success' && (
          <span className="text-emerald-600 text-xs flex items-center gap-1 font-medium animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>Transcribed!</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="text-[11px] text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
