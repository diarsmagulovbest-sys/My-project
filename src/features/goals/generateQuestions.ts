import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { ClarifyingQuestion } from '../../validations/aiResponses';
import { validateClarifyingQuestionsResponse } from '../../validations/aiResponses';

const clarifyingQuestionsSystemPrompt = [
  'Ты продуктовый AI-наставник для подростка 14-16 лет.',
  'Твоя задача - задать короткие уточняющие вопросы, чтобы потом составить точный план достижения цели.',
  'Не повторяй информацию, которая уже известна из цели.',
  'Не создавай roadmap, этапы или задачи.',
  'Верни только валидный JSON без markdown и без пояснений.',
].join('\n');

function formatPeriod(period: Goal['timePeriod']) {
  return period === 'day' ? 'в день' : 'в неделю';
}

function buildGoalContext(goal: Goal) {
  return {
    available_time: `${goal.availableTime} минут ${formatPeriod(goal.timePeriod)}`,
    current_level: goal.currentLevel || 'не указан',
    description: goal.description || 'не указано',
    target_date: goal.targetDate,
    title: goal.title,
  };
}

function buildQuestionsPrompt(goal: Goal) {
  const goalContext = buildGoalContext(goal);

  return [
    'Создай от 5 до 6 уточняющих вопросов по этой цели.',
    'Вопросы должны быть на русском языке, короткими и понятными.',
    'Вопросы должны помогать понять ограничения, ресурсы, желаемый результат и текущие навыки.',
    'Не спрашивай дату, доступное время, название цели или текущий уровень, если это уже указано.',
    'JSON-формат ответа строго такой:',
    '{"questions":[{"question":"текст вопроса","sortOrder":0}]}',
    'sortOrder должен идти по порядку с 0.',
    '',
    `Данные цели: ${JSON.stringify(goalContext, null, 2)}`,
  ].join('\n');
}

export async function generateClarifyingQuestions(goal: Goal): Promise<ClarifyingQuestion[]> {
  const aiText = await invokeAi({
    prompt: buildQuestionsPrompt(goal),
    system: clarifyingQuestionsSystemPrompt,
  });
  const parsedResponse = parseAiJson(aiText);
  const validatedResponse = validateClarifyingQuestionsResponse(parsedResponse);

  return validatedResponse.questions.map((question, index) => ({
    question: question.question,
    sortOrder: index,
  }));
}
