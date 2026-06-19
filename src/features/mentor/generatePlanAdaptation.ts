import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { ProgressLog } from '../../types/mentorChat';
import type { RoadmapStage, RoadmapTask } from '../../types/roadmap';
import type { PlanAdaptationResponse } from '../../validations/aiResponses';
import { validatePlanAdaptationResponse } from '../../validations/aiResponses';
import { getMentorProfile, getMentorProfileSystemContext } from './mentorProfiles';

export const planAdaptationReasons = [
  { id: 'not_enough_time', label: 'Не хватило времени' },
  { id: 'too_difficult', label: 'Задание слишком сложное' },
  { id: 'lost_motivation', label: 'Потерял мотивацию' },
  { id: 'unclear_material', label: 'Не понял материал' },
  { id: 'circumstances_changed', label: 'Изменились обстоятельства' },
  { id: 'other', label: 'Другая причина' },
] as const;

export type PlanAdaptationReasonId = (typeof planAdaptationReasons)[number]['id'];

export type GeneratePlanAdaptationInput = {
  comment: string;
  goal: Goal;
  progressLogs: ProgressLog[];
  reasonId: PlanAdaptationReasonId;
  roadmapStages: RoadmapStage[];
};

const planAdaptationSystemPrompt = [
  'Ты AI-наставник для подростка 14-16 лет.',
  'Предложи адаптацию плана, но не применяй изменения и не говори, что roadmap уже изменён.',
  'Ответ должен быть коротким и практичным: 1 маленькое действие на сегодня, 1-3 изменения плана, короткое объяснение.',
  'В planChanges обязательно предложи, что упростить, и что перенести, если это применимо к текущему roadmap.',
  'Если пользователь застрял, упрости ближайшую задачу до самого маленького выполнимого шага.',
  'Сохраняй стиль и safety rules mentor profile из контекста.',
  'Для programming целей предлагай конкретное упрощение coding/project/debugging task, без длинной теории.',
  'Для fitness, martial_arts и травмоопасных целей не давай опасные инструкции: упоминай разминку, ограничения, восстановление и тренера.',
  'Верни только валидный JSON без markdown и без пояснений.',
  'JSON-формат ответа строго такой:',
  '{"nextSmallAction":"...","planChanges":[{"type":"simplify","change":"..."},{"type":"postpone","change":"..."}],"explanation":"..."}',
  'type должен быть одним из: simplify, postpone, focus.',
].join('\n');

function formatTimePeriod(period: Goal['timePeriod']) {
  return period === 'day' ? 'в день' : 'в неделю';
}

function getReasonLabel(reasonId: PlanAdaptationReasonId) {
  return planAdaptationReasons.find((reason) => reason.id === reasonId)?.label ?? 'Другая причина';
}

function mapTaskContext(task: RoadmapTask) {
  return {
    description: task.description,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    title: task.title,
  };
}

function getTasksByStatus(stages: RoadmapStage[], status: RoadmapTask['status']) {
  return stages
    .flatMap((stage) => stage.tasks)
    .filter((task) => task.status === status)
    .map(mapTaskContext);
}

function buildRoadmapContext(stages: RoadmapStage[]) {
  return stages.map((stage) => ({
    description: stage.description,
    status: stage.status,
    successCriteria: stage.successCriteria,
    tasks: stage.tasks.map(mapTaskContext),
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

function buildPlanAdaptationPrompt({
  comment,
  goal,
  progressLogs,
  reasonId,
  roadmapStages,
}: GeneratePlanAdaptationInput) {
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
    'Roadmap и tasks:',
    JSON.stringify(buildRoadmapContext(roadmapStages), null, 2),
    '',
    'Выполненные задания:',
    JSON.stringify(getTasksByStatus(roadmapStages, 'completed'), null, 2),
    '',
    'Пропущенные задания:',
    JSON.stringify(getTasksByStatus(roadmapStages, 'skipped'), null, 2),
    '',
    'Последние progress logs:',
    JSON.stringify(buildProgressLogContext(progressLogs), null, 2),
    '',
    'Проблема пользователя:',
    JSON.stringify(
      {
        comment: comment.trim() || 'не указан',
        reason: getReasonLabel(reasonId),
        reason_id: reasonId,
      },
      null,
      2,
    ),
    '',
    'Предложи только адаптацию. Не меняй сохранённый план автоматически.',
  ].join('\n');
}

export async function generatePlanAdaptation(
  input: GeneratePlanAdaptationInput,
): Promise<PlanAdaptationResponse> {
  const aiText = await invokeAi({
    prompt: buildPlanAdaptationPrompt(input),
    system: planAdaptationSystemPrompt,
  });
  const parsedResponse = parseAiJson(aiText);

  return validatePlanAdaptationResponse(parsedResponse);
}
