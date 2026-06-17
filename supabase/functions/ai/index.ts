// AI Edge Function for Google Gemini.
// Frontend call: supabase.functions.invoke('ai', { body: { prompt, system } })
//
// Setup:
//   npm run ai:secret -- GEMINI_API_KEY=your_key
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
const MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_GEMINI_ATTEMPTS = 3;

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
  const redactedKeyText = GEMINI_API_KEY ? value.replaceAll(GEMINI_API_KEY, '[redacted]') : value;

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
    return `Gemini rate limit was reached. Wait a little and try again: ${upstreamMessage}`;
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

    if (!GEMINI_API_KEY) {
      throw new HttpError(
        500,
        'missing_gemini_api_key',
        'AI function is missing GEMINI_API_KEY in Supabase Secrets.',
      );
    }

    let geminiResponse: Response | null = null;
    let networkErrorMessage = '';
    const geminiRequestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    });

    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
      try {
        geminiResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: geminiRequestBody,
        });

        if (
          attempt < MAX_GEMINI_ATTEMPTS
          && shouldRetryGeminiStatus(geminiResponse.status)
        ) {
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

      writeLog('error', 'gemini_request_failed', {
        endpoint: GEMINI_API_URL,
        ...getBodySummary(body),
        responseContentType: geminiResponseContentType,
        upstreamErrorCode,
        upstreamMessage,
        upstreamStatus: geminiResponse.status,
      });

      throw new HttpError(
        502,
        'gemini_request_failed',
        getGeminiClientMessage(geminiResponse.status, upstreamMessage),
        {
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
