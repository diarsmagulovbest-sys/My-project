import { invokeAi, parseAiJson } from '../../lib/ai';
import type { AppLanguage } from '../../lib/language';
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
  'You are a practical AI mentor for a 14-16 year old learner.',
  'Create a realistic roadmap based on the goal, target date, available time, and user answers.',
  'Do not invent extra facts if the user did not provide them.',
  'Return only valid JSON without markdown or explanations.',
].join('\n');

function getLanguageName(language: AppLanguage) {
  return language === 'ru' ? 'Russian' : 'English';
}

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

function buildRoadmapSystemPrompt(goal: Goal, language: AppLanguage) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);

  return [
    baseRoadmapSystemPrompt,
    `Write every user-facing field in ${getLanguageName(language)}.`,
    '',
    'Mentor profile context:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    'Use the mentor profile to make the roadmap more specific.',
    'Profile-specific roadmap guidance:',
    ...mentorRoadmapGuidance[mentorProfile.mentorProfileId],
  ].join('\n');
}

function formatPeriod(period: Goal['timePeriod'], language: AppLanguage) {
  if (language === 'ru') {
    return period === 'day' ? 'в день' : 'в неделю';
  }

  return period === 'day' ? 'per day' : 'per week';
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

function buildRoadmapPrompt(goal: Goal, questions: GoalQuestion[], language: AppLanguage) {
  const answeredQuestions = questions
    .filter((question) => question.answer.trim())
    .map((question) => ({
      answer: question.answer.trim(),
      question: question.question,
    }));

  const goalContext = {
    available_time: `${goal.availableTime} ${language === 'ru' ? 'минут' : 'minutes'} ${formatPeriod(goal.timePeriod, language)}`,
    current_level: goal.currentLevel || (language === 'ru' ? 'не указано' : 'not provided'),
    days_until_target: getDaysUntilTarget(goal.targetDate),
    description: goal.description || (language === 'ru' ? 'не указано' : 'not provided'),
    target_date: goal.targetDate,
    title: goal.title,
    today: getTodayIsoDate(),
  };

  return [
    'Create a roadmap for reaching the goal.',
    'The plan must respect target_date and available_time.',
    'If time_period = day, tasks must fit into the available minutes per day.',
    'If time_period = week, weekly workload must be realistic for the available minutes per week.',
    'Create 2 to 8 stages. Each stage should have 1 to 8 concrete tasks.',
    'Tasks must feel like daily quest actions: short, concrete, checkable, and tied to one day when possible.',
    'Tasks must be hands-on and produce a visible result for the goal.',
    'Prefer active practice, making, solving, writing, testing, cooking, recording, or building over passive consumption.',
    'Avoid research-only tasks like "Search online", "Google", "Look up", "Watch videos", or "Find a tutorial" unless paired with an immediate practice/output task.',
    'suggestedDayOffset means how many days from today the task should be done. Do not place tasks after the target date.',
    'estimatedMinutes is the time needed for the task.',
    'feasibility.status must be one of: realistic, challenging, unrealistic.',
    'The response JSON must match this shape:',
    '{"goalSummary":"...","feasibility":{"status":"realistic","explanation":"..."},"mentorAdvice":"...","stages":[{"title":"...","description":"...","successCriteria":["..."],"tasks":[{"title":"...","description":"...","estimatedMinutes":30,"suggestedDayOffset":0}]}]}',
    '',
    `Goal data: ${JSON.stringify(goalContext, null, 2)}`,
    `Clarifying question answers: ${JSON.stringify(answeredQuestions, null, 2)}`,
  ].join('\n');
}

export async function generateRoadmap(
  goal: Goal,
  questions: GoalQuestion[],
  language: AppLanguage,
): Promise<RoadmapResponse> {
  const aiText = await invokeAi({
    prompt: buildRoadmapPrompt(goal, questions, language),
    system: buildRoadmapSystemPrompt(goal, language),
  });
  const parsedResponse = parseAiJson(aiText);

  return validateRoadmapResponse(parsedResponse);
}
