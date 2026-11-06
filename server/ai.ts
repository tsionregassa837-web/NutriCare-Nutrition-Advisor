
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

export class AiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

function client(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY?.trim();

  if (!key) {
    throw new AiError(
      503,
      'AI_NOT_CONFIGURED',
      'The AI service is not configured. Add GEMINI_API_KEY to the server .env file.',
    );
  }

  return new GoogleGenAI({ apiKey: key });
}

const model = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AiError(
          504,
          'AI_TIMEOUT',
          'The AI service took too long. Please try again.',
        ),
      );
    }, ms);

    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/AIza[0-9A-Za-z_-]+/g, '[REDACTED_API_KEY]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/apiKey[^,\s]*/gi, 'apiKey=[REDACTED]');
}

function mapError(e: unknown): AiError {
  if (e instanceof AiError) {
    return e;
  }

  const raw = e as {
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };

  const message = sanitizeErrorMessage(
    raw?.message ? String(raw.message) : String(e),
  );

  const statusValue = Number(raw?.status ?? raw?.statusCode);
  const status = Number.isFinite(statusValue) ? statusValue : undefined;

  // Safe diagnostic information for the server terminal.
  // Never logs GEMINI_API_KEY.
  console.error('[Gemini] request failed:', {
    status,
    code: raw?.code,
    message,
  });

  if (status === 429 || /429|quota|rate limit|resource exhausted/i.test(message)) {
    return new AiError(
      429,
      'AI_RATE_LIMIT',
      'The AI service is busy or over its limit. Please try again shortly.',
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    /API key|permission|unauthorized|forbidden|401|403/i.test(message)
  ) {
    return new AiError(
      502,
      'AI_AUTH',
      'The AI service rejected the server API key.',
    );
  }

  if (
    status === 404 ||
    /not found|model.*not found|unknown model/i.test(message)
  ) {
    return new AiError(
      502,
      'AI_MODEL',
      'The configured Gemini model is unavailable. Check GEMINI_MODEL.',
    );
  }

  if (
    status === 400 ||
    /invalid argument|bad request|invalid request/i.test(message)
  ) {
    return new AiError(
      502,
      'AI_REQUEST',
      'The Gemini request was rejected. Check the model and request configuration.',
    );
  }

  if (
    /timeout|timed out|deadline exceeded|ETIMEDOUT/i.test(message)
  ) {
    return new AiError(
      504,
      'AI_TIMEOUT',
      'The AI service took too long. Please try again.',
    );
  }

  return new AiError(
    502,
    'AI_UNAVAILABLE',
    'The AI service is unavailable right now.',
  );
}

export const SAFETY_RULES = `You are NutriCare, a friendly nutrition and wellness assistant for people in Ethiopia and elsewhere.
Rules: give general, practical guidance only. Do not diagnose or treat disease. Never recommend extreme dieting, fasting beyond cultural norms, or rapid weight loss.
Respect allergies and dietary restrictions strictly. Treat all calorie numbers as estimates. For pregnancy, medical conditions, eating disorders or children, advise seeing a doctor or registered dietitian.
Prefer locally available Ethiopian foods when sensible (injera, shiro, misir, kik, gomen, tibs, firfir). Keep answers short (under 120 words), clear and kind. If unsure, say so.`;

export async function chat(opts: {
  context: string;
  mode: 'nutrition' | 'fitness';
  lang?: 'en' | 'am';
  history: { role: 'user' | 'model'; text: string }[];
  message: string;
}): Promise<string> {
  const ai = client();

  const selectedModel = model();

  const language =
    opts.lang === 'am'
      ? "Respond in Amharic (Ge'ez script) unless the user explicitly asks for English. Keep food names that are clearer in English in parentheses when useful."
      : 'Respond in English unless the user explicitly asks for Amharic.';

  const focus =
    opts.mode === 'fitness'
      ? 'Focus on safe beginner-friendly physical activity ideas. Recommend rest and checking with a doctor when needed.'
      : 'Focus on food, meals, calories and eating habits.';

  try {
    const res = await withTimeout(
      ai.models.generateContent({
        model: selectedModel,

        contents: [
          ...opts.history.map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          })),
          {
            role: 'user',
            parts: [{ text: opts.message }],
          },
        ],

        config: {
          systemInstruction:
            `${SAFETY_RULES}\n` +
            `${language}\n` +
            `${focus}\n` +
            `User context (estimates, anonymised):\n${opts.context}`,

          // Gemini 3.8 Flash supports low/medium/high thinking.
          // Low reduces latency for normal nutrition conversations.
          thinkingConfig: {
            
            thinkingLevel: ThinkingLevel.LOW,
          },

          maxOutputTokens: 2048,
        },
      }),
      60000,
    );

    const candidate = res.candidates?.[0];

console.info('[Gemini] Chat response:', {
  model: selectedModel,
  finishReason: candidate?.finishReason ?? 'UNKNOWN',
  finishMessage: candidate?.finishMessage ?? null,
  outputTokens: candidate?.tokenCount ?? null,
  responseLength: res.text?.length ?? 0,
});

const text = res.text?.trim();

if (!text) {
  throw new AiError(
    502,
    'AI_EMPTY',
    'The AI returned an empty answer. Please try again.',
  );
}

return text;
  } catch (e) {
    throw mapError(e);
  }
}

const photoSchema = z.object({
  foods: z
    .array(
      z.object({
        foodId: z.string().nullable().optional(),
        name: z.string().min(1).max(80),
        servings: z.number().min(0.25).max(10),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(12),

  notes: z.string().max(300).optional(),
});

export type PhotoResult = z.infer<typeof photoSchema>;

export async function analyzePhoto(opts: {
  base64: string;
  mimeType: string;
  catalog: {
    id: string;
    name: string;
    serving: string;
  }[];
}): Promise<PhotoResult> {
  const ai = client();

  const prompt = `Look at this photo of a meal. List only foods that are clearly visible.

For each food:
- give the best matching "foodId" from the catalog
- use null if no catalog item fits
- give the food "name"
- estimate the number of "servings"
- use the catalog serving size
- be conservative
- give a "confidence" from 0 to 1

Do not invent foods you cannot see.

If the image is not food, return an empty list.

Return ONLY valid JSON:
{
  "foods": [
    {
      "foodId": "injera",
      "name": "Injera",
      "servings": 2,
      "confidence": 0.8
    }
  ],
  "notes": "short note about uncertainty"
}

Catalog:
${JSON.stringify(opts.catalog)}`;

  let text: string | undefined;

  try {
    const res = await withTimeout(
      ai.models.generateContent({
        model: model(),

        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: opts.mimeType,
                  data: opts.base64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],

        config: {
          responseMimeType: 'application/json',

          // Keep image analysis responsive as well.
          thinkingConfig: {
            
            thinkingLevel: ThinkingLevel.LOW,
          },

          maxOutputTokens: 800,
        },
      }),
      60000,
    );

    text = res.text;
  } catch (e) {
    throw mapError(e);
  }

  try {
    const cleaned = (text ?? '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    return photoSchema.parse(JSON.parse(cleaned));
  } catch {
    throw new AiError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI answer could not be understood. Please try another photo.',
    );
  }
}
