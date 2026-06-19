import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import type { RoadmapResponse } from '../../validations/aiResponses';
import { validateRoadmapResponse } from '../../validations/aiResponses';
import {
  getMentorProfile,
  getMentorProfileSystemContext,
  type MentorProfileId,
} from '../mentor/mentorProfiles';

const baseRoadmapSystemPrompt = [
  'Ты AI-наставник для подростка 14-16 лет.',
  'Составь реалистичную дорожную карту по цели, сроку, доступному времени и ответам пользователя.',
  'Не придумывай лишние данные, если пользователь их не дал.',
  'Верни только валидный JSON без markdown и без пояснений.',
].join('\n');

const mentorRoadmapGuidance: Record<MentorProfileId, string[]> = {
  general: [
    'Create broad but concrete stages with small actions, checkpoints, and realistic pacing.',
  ],
  programming: [
    'Create project-based stages: setup/tools, fundamentals, small feature practice, debugging, building a project, and review.',
    'Include practical coding tasks with clear outputs, not only reading theory.',
  ],
  language_learning: [
    'Balance speaking, listening, vocabulary, grammar, reading, and review practice.',
    'Use repeated short practice sessions and concrete language outputs.',
  ],
  fitness: [
    'Use safe progression with warmups, technique practice, rest, recovery, and simple tracking.',
    'Avoid intense jumps in volume and include safety checks for pain or discomfort.',
  ],
  martial_arts: [
    'Use safe progression with warmups, basic technique, supervised practice, recovery, and protective gear when relevant.',
    'Include a safety reminder to train with a qualified coach for sparring, high kicks, or risky drills.',
  ],
  school_exam: [
    'Organize stages by topics, weak areas, spaced review, practice tests, error analysis, and final revision.',
  ],
  music: [
    'Organize stages around technique, short practice routines, repertoire, listening, repetition, and performance checkpoints.',
  ],
  puzzle_logic: [
    'Organize stages around learning a method, practicing algorithms or patterns, repetition, timed practice, and fixing weak cases.',
  ],
  creative_skill: [
    'Organize stages around references, fundamentals, small creative projects, feedback, revision, and portfolio-style output.',
  ],
  business_project: [
    'Organize stages around idea validation, audience, simple prototype, feedback, safe launch planning, and presentation.',
  ],
};

function buildRoadmapSystemPrompt(goal: Goal) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);

  return [
    baseRoadmapSystemPrompt,
    '',
    'Mentor profile context:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    'Use the mentor profile to make the roadmap more specific, while keeping every user-facing field in Russian.',
    'Profile-specific roadmap guidance:',
    ...mentorRoadmapGuidance[mentorProfile.mentorProfileId],
  ].join('\n');
}

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
    system: buildRoadmapSystemPrompt(goal),
  });
  const parsedResponse = parseAiJson(aiText);

  return validateRoadmapResponse(parsedResponse);
}
