import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { MentorMessage, ProgressLog } from '../../types/mentorChat';
import type { RoadmapStage } from '../../types/roadmap';
import type { MentorResponse } from '../../validations/aiResponses';
import { validateMentorResponse } from '../../validations/aiResponses';
import { getMentorProfile, getMentorProfileSystemContext } from './mentorProfiles';

type GenerateMentorReplyInput = {
  goal: Goal;
  messages: MentorMessage[];
  progressLogs: ProgressLog[];
  roadmapStages: RoadmapStage[];
};

const mentorChatSystemPrompt = [
  'Ты AI-наставник для подростка 14-16 лет.',
  'Отвечай по теме конкретной цели пользователя и не уходи в общие разговоры.',
  'Помогай объяснять непонятные задания, разбивать сложные задачи на маленькие шаги и выбирать следующий безопасный шаг.',
  'Отвечай кратко и практично: сначала дай один конкретный следующий шаг, потом короткое пояснение только если нужно.',
  'Не пиши длинные лекции без необходимости. Если пользователь застрял, упрости задачу до самого маленького выполнимого действия.',
  'Задавай максимум один уточняющий вопрос за раз и только если без него нельзя выбрать следующий шаг.',
  'Всегда сохраняй стиль mentor profile из контекста.',
  'Для programming mentor давай конкретные coding, project или debugging шаги и не перегружай теорией.',
  'Не меняй сохранённый roadmap без подтверждения пользователя. Если изменение плана может понадобиться, объясни это и поставь shouldSuggestPlanChange=true.',
  'Не обещай гарантированный результат.',
  'Для fitness, martial_arts и любых потенциально травмоопасных целей сохраняй осторожный стиль: не давай опасные инструкции, напоминай про разминку, ограничения и тренера.',
  'Верни только валидный JSON без markdown и без пояснений.',
  'JSON-формат ответа строго такой:',
  '{"message":"...","suggestedActions":["..."],"shouldSuggestPlanChange":false}',
].join('\n');

function formatTimePeriod(period: Goal['timePeriod']) {
  return period === 'day' ? 'в день' : 'в неделю';
}

function buildRoadmapContext(stages: RoadmapStage[]) {
  return stages.map((stage) => ({
    description: stage.description,
    status: stage.status,
    successCriteria: stage.successCriteria,
    tasks: stage.tasks.map((task) => ({
      description: task.description,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      status: task.status,
      title: task.title,
    })),
    title: stage.title,
  }));
}

function buildProgressLogContext(progressLogs: ProgressLog[]) {
  return progressLogs.map((log) => ({
    action: log.action,
    createdAt: log.createdAt,
    note: log.note,
    taskId: log.taskId,
  }));
}

function buildMessageContext(messages: MentorMessage[]) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-10)
    .map((message) => ({
      content: message.content,
      role: message.role,
    }));
}

function buildMentorChatPrompt({
  goal,
  messages,
  progressLogs,
  roadmapStages,
}: GenerateMentorReplyInput) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);
  const goalContext = {
    available_time: `${goal.availableTime} минут ${formatTimePeriod(goal.timePeriod)}`,
    current_level: goal.currentLevel || 'не указан',
    description: goal.description || 'не указано',
    mentor_profile_id: mentorProfile.mentorProfileId,
    progress: goal.progress,
    status: goal.status,
    target_date: goal.targetDate,
    title: goal.title,
  };

  return [
    'Контекст цели:',
    JSON.stringify(goalContext, null, 2),
    '',
    'Контекст mentor profile:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    'Сохранённая дорожная карта и задачи:',
    JSON.stringify(buildRoadmapContext(roadmapStages), null, 2),
    '',
    'Последние progress logs:',
    JSON.stringify(buildProgressLogContext(progressLogs), null, 2),
    '',
    'Последние сообщения чата:',
    JSON.stringify(buildMessageContext(messages), null, 2),
    '',
    'Ответь на последнее сообщение пользователя. Пиши на русском языке, коротко и практично.',
  ].join('\n');
}

export async function generateMentorReply(input: GenerateMentorReplyInput): Promise<MentorResponse> {
  const aiText = await invokeAi({
    prompt: buildMentorChatPrompt(input),
    system: mentorChatSystemPrompt,
  });
  const parsedResponse = parseAiJson(aiText);

  return validateMentorResponse(parsedResponse);
}
