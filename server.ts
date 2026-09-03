import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { POST as analyzeLessonHandler } from './app/api/analyze-lesson/route';
import { POST as analyzeAnswerHandler } from './app/api/analyze-answer/route';
import { POST as transcribeHandler } from './app/api/transcribe/route';
import { POST as chatHandler } from './app/api/chat/route';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Increase payload limit for base64 image data URLs up to 10MB
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY),
      service: 'ARC Adaptive Engine with Gemini Live API & Transcribe',
    });
  });

  app.post('/api/analyze-lesson', async (req, res) => {
    try {
      const simulatedRequest = new Request('http://localhost:3000/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const response = await analyzeLessonHandler(simulatedRequest);
      const json = await response.json();
      res.status(response.status).json(json);
    } catch (err: any) {
      console.error('Server error in /api/analyze-lesson:', err);
      res.status(500).json({ error: 'Internal server error', details: err?.message });
    }
  });

  app.post('/api/analyze-answer', async (req, res) => {
    try {
      const simulatedRequest = new Request('http://localhost:3000/api/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const response = await analyzeAnswerHandler(simulatedRequest);
      const json = await response.json();
      res.status(response.status).json(json);
    } catch (err: any) {
      console.error('Server error in /api/analyze-answer:', err);
      res.status(500).json({ error: 'Internal server error', details: err?.message });
    }
  });

  // Audio Transcription Route using gemini-3.5-transcribe
  app.post('/api/transcribe', async (req, res) => {
    try {
      const simulatedRequest = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const response = await transcribeHandler(simulatedRequest);
      const json = await response.json();
      res.status(response.status).json(json);
    } catch (err: any) {
      console.error('Server error in /api/transcribe:', err);
      res.status(500).json({ error: 'Internal server error', details: err?.message });
    }
  });

  // AI Tutor Interactive Chat Route using gemini-3.8-flash (supports text + PDF/image attachments)
  app.post('/api/chat', async (req, res) => {
    try {
      const simulatedRequest = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const response = await chatHandler(simulatedRequest);
      const json = await response.json();
      res.status(response.status).json(json);
    } catch (err: any) {
      console.error('Server error in /api/chat:', err);
      res.status(500).json({ error: 'Internal server error', details: err?.message });
    }
  });

  // Live Voice WebSocket API with gemini-3.1-flash-live-preview
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('Client connected to ARC Live Voice WebSocket');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is required for Live Voice API.' }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are ARC, an expert adaptive reasoning and mathematics AI tutor. Engage in natural, helpful, low-latency spoken conversations with the student. Keep answers conversational, succinct, and encouraging, guiding the student through questions and prerequisite concepts.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            const modelText =
              (message.serverContent as any)?.outputTranscription?.text ||
              (message.serverContent as any)?.outputAudioTranscription?.text;
            if (modelText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ modelTranscript: modelText }));
            }
            const userText =
              (message.serverContent as any)?.inputTranscription?.text ||
              (message.serverContent as any)?.inputAudioTranscription?.text;
            if (userText && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ userTranscript: userText }));
            }
          },
          onclose: () => {
            console.log('Gemini Live session closed');
          },
          onerror: (err) => {
            console.error('Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: 'Live API connection error.' }));
            }
          },
        },
      });

      clientWs.on('message', (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (msg.text) {
            session.sendRealtimeInput({
              text: msg.text,
            });
          }
        } catch (err) {
          console.error('Error relaying message to Live session:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch (e) {}
      });
    } catch (liveErr: any) {
      console.error('Failed to establish Live API session:', liveErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: liveErr?.message || 'Could not connect to Live API.' }));
      }
    }
  });

  // Vite middleware in dev / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ARC Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

