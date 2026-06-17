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
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiReadResult = {
  body: string;
  contentType: string | null;
  data: GeminiResponse;
};

class HttpError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      }),
    });

    const {
      body: geminiResponseBody,
      contentType: geminiResponseContentType,
      data: geminiData,
    } = await readGeminiResponse(geminiResponse);

    if (!geminiResponse.ok) {
      writeLog('error', 'gemini_request_failed', {
        endpoint: GEMINI_API_URL,
        ...getBodySummary(body),
        responseContentType: geminiResponseContentType,
        upstreamErrorCode: geminiData.error?.status ?? geminiData.error?.code ?? null,
        upstreamMessage: getUpstreamMessage(geminiData, geminiResponseBody),
        upstreamStatus: geminiResponse.status,
      });

      throw new HttpError(502, 'gemini_request_failed', 'Gemini API returned an error.');
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text.trim()) {
      throw new HttpError(502, 'gemini_empty_response', 'Gemini returned an empty response.');
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

    return jsonResponse({ code, error: message }, status);
  }
});
