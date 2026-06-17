import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AiFunctionResponse = {
  code?: string;
  error?: string;
  text?: string;
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

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const value: unknown = await error.context.json().catch(() => null);

    if (isAiFunctionResponse(value) && typeof value.error === 'string') {
      return value.code ? `${value.error} (${value.code})` : value.error;
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
    throw new Error(data.error);
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
