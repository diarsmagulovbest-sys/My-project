import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AiFunctionResponse = {
  code?: string;
  error?: string;
  text?: string;
  upstreamErrorCode?: number | string | null;
  upstreamStatus?: number;
};

type InvokeAiInput = {
  prompt: string;
  system?: string;
};

function stripJsonFence(value: string) {
  const trimmed = value.trim();
  const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedJson?.[1]?.trim() ?? trimmed;
}

function isAiFunctionResponse(value: unknown): value is AiFunctionResponse {
  return typeof value === 'object' && value !== null;
}

function getReadableAiError(value: AiFunctionResponse) {
  if (!value.error) {
    return null;
  }

  const details = [
    value.upstreamStatus ? `status ${value.upstreamStatus}` : null,
    value.upstreamErrorCode ? String(value.upstreamErrorCode) : null,
  ].filter(Boolean);

  return details.length > 0 ? `${value.error} (${details.join(', ')})` : value.error;
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const value: unknown = await error.context.json().catch(() => null);

    if (isAiFunctionResponse(value)) {
      const readableError = getReadableAiError(value);

      if (readableError) {
        return readableError;
      }
    }
  }

  return error instanceof Error ? error.message : 'Неизвестная ошибка Edge Function';
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
    throw new Error('AI вернул пустой ответ. Попробуй ещё раз.');
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
        throw new Error('AI вернул ответ не в JSON-формате. Попробуй сгенерировать вопросы ещё раз.');
      }
    }

    throw new Error('AI вернул ответ не в JSON-формате. Попробуй сгенерировать вопросы ещё раз.');
  }
}
