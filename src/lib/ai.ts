import { FunctionsHttpError } from '@supabase/supabase-js';
import { languageStorageKey, type AppLanguage } from './language';
import { supabase } from './supabase';

type AiFunctionResponse = {
  code?: string;
  error?: string;
  status?: number;
  text?: string;
  upstreamErrorCode?: number | string | null;
  upstreamStatus?: number;
};

type InvokeAiInput = {
  prompt: string;
  system?: string;
};

const aiRateLimitMessages: Record<AppLanguage, string> = {
  en: 'AI is temporarily overloaded or the request limit was reached. Try again in about a minute.',
  ru: 'AI временно перегружен или достигнут лимит запросов. Попробуй ещё раз через минуту.',
};

function getCurrentLanguage(): AppLanguage {
  try {
    return localStorage.getItem(languageStorageKey) === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

function getAiRateLimitMessage() {
  return aiRateLimitMessages[getCurrentLanguage()];
}

function stripJsonFence(value: string) {
  const trimmed = value.trim();
  const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedJson?.[1]?.trim() ?? trimmed;
}

function isAiFunctionResponse(value: unknown): value is AiFunctionResponse {
  return typeof value === 'object' && value !== null;
}

function isAiRateLimitResponse(value: AiFunctionResponse, responseStatus?: number) {
  return (
    responseStatus === 429 ||
    value.status === 429 ||
    value.upstreamStatus === 429 ||
    String(value.upstreamErrorCode) === '429' ||
    value.code === 'gemini_rate_limited'
  );
}

function writeAiRateLimitLog(value: AiFunctionResponse, responseStatus?: number) {
  console.warn(
    JSON.stringify({
      code: value.code ?? null,
      event: 'ai_rate_limited',
      responseStatus: responseStatus ?? value.status ?? null,
      upstreamErrorCode: value.upstreamErrorCode ?? null,
      upstreamStatus: value.upstreamStatus ?? null,
    }),
  );
}

function getReadableAiError(value: AiFunctionResponse, responseStatus?: number) {
  if (!value.error) {
    return null;
  }

  if (isAiRateLimitResponse(value, responseStatus)) {
    writeAiRateLimitLog(value, responseStatus);

    return getAiRateLimitMessage();
  }

  const details = [
    value.status ? `status ${value.status}` : null,
    value.upstreamStatus ? `status ${value.upstreamStatus}` : null,
    value.upstreamErrorCode ? String(value.upstreamErrorCode) : null,
  ].filter(Boolean);

  return details.length > 0 ? `${value.error} (${details.join(', ')})` : value.error;
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const value: unknown = await error.context.json().catch(() => null);

    if (isAiFunctionResponse(value)) {
      const readableError = getReadableAiError(value, error.context.status);

      if (readableError) {
        return readableError;
      }
    }

    if (error.context.status === 429) {
      writeAiRateLimitLog({}, error.context.status);

      return getAiRateLimitMessage();
    }
  }

  return error instanceof Error
    ? error.message
    : getCurrentLanguage() === 'ru'
      ? 'Неизвестная ошибка Edge Function'
      : 'Unknown Edge Function error';
}

export async function invokeAi({ prompt, system }: InvokeAiInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke<AiFunctionResponse>('ai', {
    body: { prompt, system },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (data?.error) {
    throw new Error(getReadableAiError(data) ?? data.error);
  }

  if (!data?.text?.trim()) {
    throw new Error(
      getCurrentLanguage() === 'ru'
        ? 'AI вернул пустой ответ. Попробуй ещё раз.'
        : 'AI returned an empty response. Try again.',
    );
  }

  return data.text;
}

export function parseAiJson(text: string): unknown {
  const preparedText = stripJsonFence(text);

  try {
    return JSON.parse(preparedText);
  } catch {
    const firstBrace = preparedText.indexOf('{');
    const lastBrace = preparedText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(preparedText.slice(firstBrace, lastBrace + 1));
      } catch {
        throw new Error(
          getCurrentLanguage() === 'ru'
            ? 'AI вернул ответ не в JSON-формате. Попробуй ещё раз.'
            : 'AI returned a non-JSON response. Try again.',
        );
      }
    }

    throw new Error(
      getCurrentLanguage() === 'ru'
        ? 'AI вернул ответ не в JSON-формате. Попробуй ещё раз.'
        : 'AI returned a non-JSON response. Try again.',
    );
  }
}
