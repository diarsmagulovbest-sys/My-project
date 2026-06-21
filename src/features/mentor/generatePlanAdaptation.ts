import { invokeAi, parseAiJson } from '../../lib/ai';
import type { AppLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { ProgressLog } from '../../types/mentorChat';
import type { RoadmapStage, RoadmapTask } from '../../types/roadmap';
import type { PlanAdaptationResponse } from '../../validations/aiResponses';
import { validatePlanAdaptationResponse } from '../../validations/aiResponses';
import { getMentorProfile, getMentorProfileSystemContext } from './mentorProfiles';

export const planAdaptationReasons = [
  { id: 'not_enough_time' },
  { id: 'too_difficult' },
  { id: 'lost_motivation' },
  { id: 'unclear_material' },
  { id: 'circumstances_changed' },
  { id: 'other' },
] as const;

export type PlanAdaptationReasonId = (typeof planAdaptationReasons)[number]['id'];

const planAdaptationReasonLabels: Record<
  AppLanguage,
  Record<PlanAdaptationReasonId, string>
> = {
  en: {
    circumstances_changed: 'My situation changed',
    lost_motivation: 'Lost motivation',
    not_enough_time: 'Not enough time',
    other: 'Other reason',
    too_difficult: 'The task is too difficult',
    unclear_material: 'I do not understand the material',
  },
  ru: {
    circumstances_changed: 'Изменились обстоятельства',
    lost_motivation: 'Потерял мотивацию',
    not_enough_time: 'Не хватило времени',
    other: 'Другая причина',
    too_difficult: 'Задание слишком сложное',
    unclear_material: 'Не понял материал',
  },
};

export function getPlanAdaptationReasonLabel(
  reasonId: PlanAdaptationReasonId,
  language: AppLanguage,
) {
  return planAdaptationReasonLabels[language][reasonId];
}

export type GeneratePlanAdaptationInput = {
  comment: string;
  goal: Goal;
  language: AppLanguage;
  progressLogs: ProgressLog[];
  reasonId: PlanAdaptationReasonId;
  roadmapStages: RoadmapStage[];
};

const planAdaptationSystemPrompt = [
  'You are a practical AI mentor for a 14-16 year old learner.',
  'Suggest an adaptation, but do not apply changes and do not say the roadmap has already changed.',
  'Keep the response short and practical: one small action for today, 1-3 plan changes, and a brief reason.',
  'In planChanges, suggest what to simplify and what to postpone when relevant.',
  'If the user is stuck, simplify the nearest task into the smallest doable step.',
  'Preserve the mentor profile style and safety rules from context.',
  'For programming goals, suggest a concrete coding, project, or debugging simplification without long theory.',
  'For fitness, martial_arts, and injury-risk goals, avoid dangerous instructions and mention warmup, limitations, recovery, and a qualified coach when relevant.',
  'Return only valid JSON without markdown or explanations.',
  'The response JSON must match this shape:',
  '{"nextSmallAction":"...","planChanges":[{"type":"simplify","change":"..."},{"type":"postpone","change":"..."}],"explanation":"..."}',
  'type must be one of: simplify, postpone, focus.',
].join('\n');

function getLanguageName(language: AppLanguage) {
  return language === 'ru' ? 'Russian' : 'English';
}

function formatTimePeriod(period: Goal['timePeriod'], language: AppLanguage) {
  if (language === 'ru') {
    return period === 'day' ? 'в день' : 'в неделю';
  }

  return period === 'day' ? 'per day' : 'per week';
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
  language,
  progressLogs,
  reasonId,
  roadmapStages,
}: GeneratePlanAdaptationInput) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);
  const goalContext = {
    available_time: `${goal.availableTime} ${language === 'ru' ? 'минут' : 'minutes'} ${formatTimePeriod(goal.timePeriod, language)}`,
    current_level: goal.currentLevel || (language === 'ru' ? 'не указано' : 'not provided'),
    description: goal.description || (language === 'ru' ? 'не указано' : 'not provided'),
    mentor_profile_id: mentorProfile.mentorProfileId,
    progress: goal.progress,
    status: goal.status,
    target_date: goal.targetDate,
    title: goal.title,
  };

  return [
    'Goal context:',
    JSON.stringify(goalContext, null, 2),
    '',
    'Mentor profile context:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    'Roadmap and tasks:',
    JSON.stringify(buildRoadmapContext(roadmapStages), null, 2),
    '',
    'Completed tasks:',
    JSON.stringify(getTasksByStatus(roadmapStages, 'completed'), null, 2),
    '',
    'Skipped tasks:',
    JSON.stringify(getTasksByStatus(roadmapStages, 'skipped'), null, 2),
    '',
    'Recent progress logs:',
    JSON.stringify(buildProgressLogContext(progressLogs), null, 2),
    '',
    'User problem:',
    JSON.stringify(
      {
        comment: comment.trim() || (language === 'ru' ? 'не указано' : 'not provided'),
        reason: getPlanAdaptationReasonLabel(reasonId, language),
        reason_id: reasonId,
      },
      null,
      2,
    ),
    '',
    `Suggest only an adaptation in ${getLanguageName(language)}. Do not automatically change the saved plan.`,
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
