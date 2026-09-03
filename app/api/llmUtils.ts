import { GoogleGenAI, Type } from '@google/genai';

/**
 * Candidate models to try in sequence for text / multimodal evaluation tasks.
 * If the primary model encounters a temporary 503 (High Demand) or 429,
 * we gracefully cascade to the alternative models.
 */
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

/**
 * Robust JSON extractor for LLM output strings.
 * Handles clean JSON, markdown code blocks, embedded JSON with preamble/thought text,
 * and trailing commas.
 */
export function extractJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string input provided for JSON extraction');
  }

  const trimmed = rawText.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Proceed to extraction
  }

  // 2. Markdown code block extraction: ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const insideBlock = codeBlockMatch[1].trim();
    try {
      return JSON.parse(insideBlock);
    } catch {
      // May have trailing comma or internal noise, proceed to brace search
    }
  }

  // 3. Find outer-most JSON object { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Strip trailing commas before closing braces/brackets
      const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch {
        // Proceed to next fallback
      }
    }
  }

  // 4. Find outer-most JSON array [ ... ]
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = trimmed.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch {
        // Fall through
      }
    }
  }

  throw new Error(`Could not parse valid JSON from model response (starts with "${trimmed.slice(0, 60)}...")`);
}

/**
 * Sleep helper for retry backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a Gemini generateContent call with automatic retry on 503/429
 * and automatic fallback across valid Gemini candidate models.
 */
export async function generateGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const modelsToTry = [
    params.preferredModel || 'gemini-3.8-flash',
    ...GEMINI_CANDIDATE_MODELS.filter((m) => m !== (params.preferredModel || 'gemini-3.8-flash')),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    // Attempt up to 2 times for transient network/spike errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          return { response, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isQuotaExhausted =
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('exceeded your current quota') ||
          errMsg.includes('quota');

        if (isQuotaExhausted) {
          // Quota exhausted on project/key - all Gemini models will fail, fail fast
          throw err;
        }

        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('fetch failed');

        if (isTransient && attempt === 0) {
          // Quick jitter backoff before retrying this model
          await sleep(400);
          continue;
        }

        // If not transient or second attempt failed, break to next candidate model
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed.');
}
