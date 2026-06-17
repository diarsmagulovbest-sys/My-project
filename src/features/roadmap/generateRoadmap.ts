import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import type { RoadmapResponse } from '../../validations/aiResponses';
import { validateRoadmapResponse } from '../../validations/aiResponses';

const roadmapSystemPrompt = [
  'Ты AI-наставник для подростка 14-16 лет.',
  'Составь реалистичную дорожную карту по цели, сроку, доступному времени и ответам пользователя.',
  'Не придумывай лишние данные, если пользователь их не дал.',
  'Верни только валидный JSON без markdown и без пояснений.',
].join('\n');

function formatPeriod(period: Goal['timePeriod']) {
  return period === 'day' ? 'в день' : 'в неделю';
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysUntilTarget(targetDate: string) {
  const today = new Date(`${getTodayIsoDate()}T00:00:00.000Z`);
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / millisecondsPerDay));
}

function buildRoadmapPrompt(goal: Goal, questions: GoalQuestion[]) {
  const answeredQuestions = questions
    .filter((question) => question.answer.trim())
    .map((question) => ({
      answer: question.answer.trim(),
      question: question.question,
    }));

  const goalContext = {
    available_time: `${goal.availableTime} минут ${formatPeriod(goal.timePeriod)}`,
    current_level: goal.currentLevel || 'не указан',
    days_until_target: getDaysUntilTarget(goal.targetDate),
    description: goal.description || 'не указано',
    target_date: goal.targetDate,
    title: goal.title,
    today: getTodayIsoDate(),
  };

  return [
    'Создай дорожную карту достижения цели.',
    'План должен учитывать target_date и available_time.',
    'Если time_period = day, задачи должны помещаться в доступные минуты в день.',
    'Если time_period = week, недельная нагрузка должна быть реалистичной для доступных минут в неделю.',
    'Сделай от 2 до 8 этапов. В каждом этапе сделай от 1 до 8 конкретных задач.',
    'suggestedDayOffset - через сколько дней от today лучше сделать задачу. Не ставь offset дальше срока цели.',
    'estimatedMinutes - сколько минут займёт задача.',
    'feasibility.status должен быть одним из: realistic, challenging, unrealistic.',
    'JSON-формат ответа строго такой:',
    '{"goalSummary":"...","feasibility":{"status":"realistic","explanation":"..."},"mentorAdvice":"...","stages":[{"title":"...","description":"...","successCriteria":["..."],"tasks":[{"title":"...","description":"...","estimatedMinutes":30,"suggestedDayOffset":0}]}]}',
    '',
    `Данные цели: ${JSON.stringify(goalContext, null, 2)}`,
    `Ответы на уточняющие вопросы: ${JSON.stringify(answeredQuestions, null, 2)}`,
  ].join('\n');
}

export async function generateRoadmap(goal: Goal, questions: GoalQuestion[]): Promise<RoadmapResponse> {
  const aiText = await invokeAi({
    prompt: buildRoadmapPrompt(goal, questions),
    system: roadmapSystemPrompt,
  });
  const parsedResponse = parseAiJson(aiText);

  return validateRoadmapResponse(parsedResponse);
}
