import { invokeAi, parseAiJson } from '../../lib/ai';
import type { CreateGoalInput } from '../../types/goal';
import type { GoalAiAnalysisResponse } from '../../validations/aiResponses';
import { validateGoalAiAnalysisResponse } from '../../validations/aiResponses';

const goalAnalysisSystemPrompt = [
  'Ты AI-наставник для подростка 14-16 лет.',
  'Помоги превратить цель пользователя в понятный первый план.',
  'Пиши на русском языке, коротко и дружелюбно.',
  'Не придумывай факты, которых пользователь не указал.',
  'Верни только валидный JSON без markdown и без пояснений.',
].join('\n');

function formatPeriod(period: CreateGoalInput['timePeriod']) {
  return period === 'day' ? 'в день' : 'в неделю';
}

function buildGoalAnalysisPrompt(input: CreateGoalInput) {
  const goalContext = {
    available_time: `${input.availableTime} минут ${formatPeriod(input.timePeriod)}`,
    current_level: input.currentLevel || 'не указан',
    description: input.description || 'не указано',
    target_date: input.targetDate,
    title: input.title,
  };

  return [
    'Проанализируй цель пользователя и создай стартовый AI-ответ.',
    'goalSummary - краткое описание цели и результата.',
    'estimatedUserLevel - предполагаемый уровень пользователя на основе данных.',
    'steps - от 3 до 5 понятных шагов.',
    'clarificationQuestions - вопросы, которые помогут уточнить план.',
    'firstSmallAction - маленькое действие, которое можно сделать сегодня за 10-30 минут.',
    'JSON-формат ответа строго такой:',
    '{"goalSummary":"...","estimatedUserLevel":"...","steps":["...","...","..."],"clarificationQuestions":["..."],"firstSmallAction":"..."}',
    '',
    `Данные цели: ${JSON.stringify(goalContext, null, 2)}`,
  ].join('\n');
}

export async function generateGoalAnalysis(
  input: CreateGoalInput,
): Promise<GoalAiAnalysisResponse> {
  const aiText = await invokeAi({
    prompt: buildGoalAnalysisPrompt(input),
    system: goalAnalysisSystemPrompt,
  });
  const parsedResponse = parseAiJson(aiText);

  return validateGoalAiAnalysisResponse(parsedResponse);
}
