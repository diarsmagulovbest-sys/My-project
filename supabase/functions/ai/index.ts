// AI Edge Function for Google Gemini.
// Frontend call: supabase.functions.invoke('ai', { body: { prompt, system } })
//
// Setup:
//   npm run ai:secret -- GEMINI_API_KEY=your_key
//   npm run ai:secret -- GEMINI_API_KEY_2=your_backup_key
//   npm run ai:deploy

type AiRequestBody = {
  prompt?: unknown;
  system?: unknown;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
  promptFeedback?: {
    blockReason?: string;
  };
};

type GeminiReadResult = {
  body: string;
  contentType: string | null;
  data: GeminiResponse;
};

class HttpError extends Error {
  code: string;
  details: Record<string, unknown>;
  status: number;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_KEY_2 = Deno.env.get('GEMINI_API_KEY_2') ?? Deno.env.get('GEMINI_API_KEY_FALLBACK');
const MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_GEMINI_ATTEMPTS = 3;
const AI_RATE_LIMIT_MESSAGE =
  'AI временно перегружен или достигнут лимит запросов. Попробуй ещё раз через минуту.';
const GEMINI_API_KEYS = [
  { label: 'primary', value: GEMINI_API_KEY },
  { label: 'secondary', value: GEMINI_API_KEY_2 },
].filter((key): key is { label: string; value: string } => Boolean(key.value));

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function getBodySummary(body: AiRequestBody | null) {
  return {
    hasPrompt: typeof body?.prompt === 'string' && body.prompt.trim().length > 0,
    hasSystem: typeof body?.system === 'string' && body.system.trim().length > 0,
    promptLength: typeof body?.prompt === 'string' ? body.prompt.length : 0,
    systemLength: typeof body?.system === 'string' ? body.system.length : 0,
  };
}

function sanitizeLogText(value: string) {
  // Logs may include upstream error bodies, so redact configured keys before writing them.
  const redactedKeyText = GEMINI_API_KEYS.reduce(
    (text, key) => text.replaceAll(key.value, '[redacted]'),
    value,
  );

  return redactedKeyText.length > 2000 ? `${redactedKeyText.slice(0, 2000)}...` : redactedKeyText;
}

function getUpstreamMessage(data: GeminiResponse, body: string) {
  return data.error?.message ?? sanitizeLogText(body);
}

function getGeminiClientMessage(status: number, upstreamMessage: string) {
  if (status === 400) {
    return `Gemini rejected the request: ${upstreamMessage}`;
  }

  if (status === 401 || status === 403) {
    return `Gemini API key is not allowed to make this request: ${upstreamMessage}`;
  }

  if (status === 404) {
    return `Gemini model or endpoint was not found: ${upstreamMessage}`;
  }

  if (status === 429) {
    return AI_RATE_LIMIT_MESSAGE;
  }

  if (status >= 500) {
    return `Gemini is temporarily unavailable. Try again soon: ${upstreamMessage}`;
  }

  return `Gemini API returned an error: ${upstreamMessage}`;
}

function writeLog(
  level: 'error' | 'info',
  event: string,
  details: Record<string, unknown> = {},
) {
  const payload = {
    event,
    model: MODEL,
    ...details,
  };

  console[level](JSON.stringify(payload));
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function shouldRetryGeminiStatus(status: number) {
  return status === 429 || status >= 500;
}

function shouldSwitchGeminiKey(status: number) {
  return status === 429;
}

async function readJsonBody(req: Request): Promise<AiRequestBody> {
  try {
    return (await req.json()) as AiRequestBody;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

function getPrompt(body: AiRequestBody) {
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    throw new HttpError(400, 'missing_prompt', 'Request body must include a non-empty prompt.');
  }

  return body.prompt;
}

function getSystem(body: AiRequestBody) {
  return typeof body.system === 'string' && body.system.trim().length > 0 ? body.system : undefined;
}

async function readGeminiResponse(response: Response): Promise<GeminiReadResult> {
  const responseText = await response.text();
  const contentType = response.headers.get('content-type');

  try {
    return {
      body: sanitizeLogText(responseText),
      contentType,
      data: JSON.parse(responseText) as GeminiResponse,
    };
  } catch {
    throw new HttpError(502, 'gemini_invalid_json', 'Gemini returned a non-JSON response.');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  let body: AiRequestBody | null = null;

  try {
    body = await readJsonBody(req);
    const prompt = getPrompt(body);
    const system = getSystem(body);

    if (GEMINI_API_KEYS.length === 0) {
      throw new HttpError(
        500,
        'missing_gemini_api_key',
        'AI function is missing GEMINI_API_KEY in Supabase Secrets.',
      );
    }

    let geminiResponse: Response | null = null;
    let networkErrorMessage = '';
    let usedKeyLabel = GEMINI_API_KEYS[0].label;
    const geminiRequestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    });

    for (let keyIndex = 0; keyIndex < GEMINI_API_KEYS.length; keyIndex += 1) {
      const geminiKey = GEMINI_API_KEYS[keyIndex];
      usedKeyLabel = geminiKey.label;

      for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
        try {
          geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiKey.value,
            },
            body: geminiRequestBody,
          });

          if (
            shouldSwitchGeminiKey(geminiResponse.status)
            && keyIndex < GEMINI_API_KEYS.length - 1
          ) {
            // A quota-limited key should fail over quickly instead of spending all retries on it.
            writeLog('info', 'gemini_key_rate_limited', {
              attempt,
              keySlot: geminiKey.label,
              upstreamStatus: geminiResponse.status,
            });
            await wait(200);
            break;
          }

          if (
            attempt < MAX_GEMINI_ATTEMPTS
            && shouldRetryGeminiStatus(geminiResponse.status)
          ) {
            // Retry only transient upstream statuses; validation/auth errors should return fast.
            await wait(350 * attempt);
            continue;
          }

          break;
        } catch (error) {
          networkErrorMessage = error instanceof Error ? error.message : 'Network request failed.';

          if (attempt < MAX_GEMINI_ATTEMPTS) {
            await wait(350 * attempt);
            continue;
          }
        }
      }

      if (geminiResponse?.ok || !shouldSwitchGeminiKey(geminiResponse?.status ?? 0)) {
        break;
      }
    }

    if (!geminiResponse) {
      throw new HttpError(
        502,
        'gemini_network_error',
        `Could not reach Gemini API: ${networkErrorMessage || 'Network request failed.'}`,
      );
    }

    const {
      body: geminiResponseBody,
      contentType: geminiResponseContentType,
      data: geminiData,
    } = await readGeminiResponse(geminiResponse);

    if (!geminiResponse.ok) {
      const upstreamMessage = getUpstreamMessage(geminiData, geminiResponseBody);
      const upstreamErrorCode = geminiData.error?.status ?? geminiData.error?.code ?? null;
      const retryAfter = geminiResponse.headers.get('retry-after');
      const isRateLimited = geminiResponse.status === 429;

      writeLog('error', isRateLimited ? 'gemini_rate_limited' : 'gemini_request_failed', {
        endpoint: GEMINI_API_URL,
        ...getBodySummary(body),
        responseContentType: geminiResponseContentType,
        keySlot: usedKeyLabel,
        upstreamErrorCode,
        upstreamStatus: geminiResponse.status,
        ...(retryAfter ? { retryAfter } : {}),
        ...(isRateLimited ? {} : { upstreamMessage }),
      });

      throw new HttpError(
        isRateLimited ? 429 : 502,
        isRateLimited ? 'gemini_rate_limited' : 'gemini_request_failed',
        getGeminiClientMessage(geminiResponse.status, upstreamMessage),
        {
          ...(isRateLimited ? { status: 429 } : {}),
          upstreamErrorCode,
          upstreamStatus: geminiResponse.status,
        },
      );
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text.trim()) {
      const finishReason = geminiData.candidates?.[0]?.finishReason ?? null;
      const blockReason = geminiData.promptFeedback?.blockReason ?? null;

      throw new HttpError(
        502,
        'gemini_empty_response',
        blockReason
          ? `Gemini blocked the response: ${blockReason}. Try rephrasing the goal.`
          : `Gemini returned an empty response${finishReason ? ` (${finishReason})` : ''}. Try again.`,
        {
          blockReason,
          finishReason,
        },
      );
    }

    writeLog('info', 'ai_success', {
      ...getBodySummary(body),
      keySlot: usedKeyLabel,
      responseLength: text.length,
    });

    return jsonResponse({ text });
  } catch (error) {
    const code = error instanceof HttpError ? error.code : 'unexpected_error';
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof HttpError ? error.message : 'Unexpected Edge Function error.';

    writeLog('error', 'ai_error', {
      ...getBodySummary(body),
      code,
      status,
    });

    return jsonResponse(
      {
        code,
        error: message,
        ...(error instanceof HttpError ? error.details : {}),
      },
      status,
    );
  }
});
