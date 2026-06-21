import { invokeAi, parseAiJson } from '../../lib/ai';
import type { AppLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { MentorMessage, ProgressLog } from '../../types/mentorChat';
import type { RoadmapStage } from '../../types/roadmap';
import type { MentorResponse } from '../../validations/aiResponses';
import { validateMentorResponse } from '../../validations/aiResponses';
import { getMentorProfile, getMentorProfileSystemContext } from './mentorProfiles';

type GenerateMentorReplyInput = {
  goal: Goal;
  language: AppLanguage;
  messages: MentorMessage[];
  progressLogs: ProgressLog[];
  roadmapStages: RoadmapStage[];
};

const mentorChatSystemPrompt = [
  'You are a practical AI mentor for a 14-16 year old learner.',
  'Answer only about the user current goal and avoid generic lectures.',
  'Help explain unclear tasks, break hard work into small steps, and choose the next safe step.',
  'Keep replies short and practical: start with one concrete next step, then add a brief explanation only if needed.',
  'If the user is stuck, simplify the task into the smallest doable action.',
  'Ask at most one clarifying question at a time, and only if it is needed to choose the next step.',
  'Preserve the mentor profile style from context.',
  'For programming mentors, give concrete coding, project, or debugging steps without overloading theory.',
  'Do not change the saved roadmap without user confirmation. If a plan change may be useful, explain it and set shouldSuggestPlanChange=true.',
  'Do not promise guaranteed results.',
  'For fitness, martial_arts, and injury-risk goals, stay cautious: avoid dangerous instructions and mention warmup, limitations, recovery, and a qualified coach when relevant.',
  'Return only valid JSON without markdown or explanations.',
  'The response JSON must match this shape:',
  '{"message":"...","suggestedActions":["..."],"shouldSuggestPlanChange":false}',
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
  language,
  messages,
  progressLogs,
  roadmapStages,
}: GenerateMentorReplyInput) {
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
    'Saved roadmap and tasks:',
    JSON.stringify(buildRoadmapContext(roadmapStages), null, 2),
    '',
    'Recent progress logs:',
    JSON.stringify(buildProgressLogContext(progressLogs), null, 2),
    '',
    'Recent chat messages:',
    JSON.stringify(buildMessageContext(messages), null, 2),
    '',
    `Answer the latest user message in ${getLanguageName(language)}. Be short, practical, and mentor-like.`,
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
