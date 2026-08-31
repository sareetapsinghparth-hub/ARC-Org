import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { base64Audio, mimeType } = body;

    if (!base64Audio) {
      return Response.json(
        { error: 'No audio data provided for transcription.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Strip header prefix if present (e.g., data:audio/webm;base64,)
    const cleanBase64 = base64Audio.includes(',')
      ? base64Audio.split(',')[1]
      : base64Audio;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe the spoken audio verbatim with exact mathematical terminology and equations where applicable. Return only the transcription.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    return Response.json({ transcription });
  } catch (error: any) {
    console.error('Error in gemini-3.5-transcribe route:', error);
    return Response.json(
      { error: error?.message || 'Audio transcription failed.' },
      { status: 500 }
    );
  }
}
