import { GoogleGenAI } from '@google/genai';
import { generateGeminiWithFallback } from '../llmUtils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, context, attachment } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    const topicContext = context?.topic ? `Active Curriculum Topic: ${context.topic}` : '';
    const conceptContext = context?.conceptName ? `Target Concept: ${context.conceptName} (Current Mastery: ${Math.round((context.confidence ?? 0.5) * 100)}%)` : '';
    const questionContext = context?.questionPrompt ? `Current Diagnostic Question: "${context.questionPrompt}"` : '';

    const systemInstruction = `You are ARC AI Tutor, an adaptive reasoning and STEM master tutor.
Your mission is to help the student deeply understand complex concepts, analyze uploaded notes or PDF documents, walk through algebraic or conceptual derivations, and provide clear, intuitive explanations.
${topicContext ? `\n${topicContext}` : ''}
${conceptContext ? `\n${conceptContext}` : ''}
${questionContext ? `\n${questionContext}` : ''}

Key guidelines:
1. Be encouraging, clear, and mathematically accurate.
2. Use clear markdown formatting, bullet points, and clean mathematical notations (e.g. LaTeX or standard algebraic notation).
3. If the student asks for a hint on their question, provide a helpful conceptual stepping stone first.
4. If the student uploads notes, text, or a PDF document, directly answer their questions by synthesizing and citing key principles from that material.
5. Keep explanations engaging, concise, and structured.`;

    // 1. Try Gemini 3.8 Flash
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Convert messages to Gemini format
        // The last message may have an attachment (PDF, image, etc.)
        const contents: any[] = [];

        // Build history
        if (Array.isArray(messages)) {
          for (let i = 0; i < messages.length; i++) {
            const m = messages[i];
            const isLatest = i === messages.length - 1;
            const parts: any[] = [];

            // If attachment is attached to this message or provided separately for the latest user message
            const currentAttachment = m.attachment || (isLatest ? attachment : null);
            if (currentAttachment && currentAttachment.dataUrl) {
              const match = currentAttachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1] || 'application/pdf',
                    data: match[2],
                  },
                });
              }
            }

            if (m.content) {
              parts.push({ text: m.content });
            }

            if (parts.length > 0) {
              contents.push({
                role: m.role === 'model' ? 'model' : 'user',
                parts,
              });
            }
          }
        }

        // If no valid contents, create a default user message
        if (contents.length === 0) {
          contents.push({
            role: 'user',
            parts: [{ text: 'Hello! Can you help me study this topic?' }],
          });
        }

        const { response } = await generateGeminiWithFallback(ai, {
          preferredModel: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });

        const reply = response.text || 'I am ready to help you explore and master this topic! What would you like to focus on?';
        return Response.json({ reply });
      } catch (geminiErr: any) {
        console.warn('Gemini chat attempt failed, falling back:', geminiErr?.message || geminiErr);
      }
    }

    // 2. Fallback to NVIDIA if available
    if (nvidiaKey) {
      try {
        const formattedMessages = [
          { role: 'system', content: systemInstruction },
          ...(messages || []).map((m: any) => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.content || '',
          })),
        ];

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-ultra-550b-a55b',
            messages: formattedMessages,
            temperature: 0.4,
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || 'Here to help you master this concept!';
          return Response.json({ reply });
        }
      } catch (nvidiaErr) {
        console.warn('NVIDIA chat error:', nvidiaErr);
      }
    }

    // 3. Deterministic tutor fallback
    const latestUserMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
    let fallbackReply = `I'm ARC AI Tutor. We are currently working on "${context?.topic || 'this subject'}". `;
    if (latestUserMsg.includes('hint')) {
      fallbackReply += `Here is a hint: focus on how the prerequisite foundations establish the algebraic invariants before substituting into the dependent formula.`;
    } else if (latestUserMsg.includes('explain') || latestUserMsg.includes('what is')) {
      fallbackReply += `The core idea centers around understanding the rate of change and mapping vectors across states. Would you like me to walk through a concrete example?`;
    } else {
      fallbackReply += `Feel free to ask for a hint, request a step-by-step breakdown of any question, or upload your own notes / PDF for a personalized study session!`;
    }

    return Response.json({ reply: fallbackReply });
  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return Response.json(
      { error: 'Failed to process chat message', details: String(err) },
      { status: 500 }
    );
  }
}
