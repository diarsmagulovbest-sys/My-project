import { invokeAi, parseAiJson } from '../../lib/ai';
import type { AppLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { ClarifyingQuestion } from '../../validations/aiResponses';
import { validateClarifyingQuestionsResponse } from '../../validations/aiResponses';
import {
  getMentorProfile,
  getMentorProfileSystemContext,
  type MentorProfileId,
} from '../mentor/mentorProfiles';

const baseClarifyingQuestionsSystemPrompt = [
  'You are a practical AI mentor for a 14-16 year old learner.',
  'Create short multiple-choice customization questions so the app can build a useful plan later.',
  'Do not repeat information that is already clear from the goal.',
  'Do not create a roadmap, stages, or tasks.',
  'Return only valid JSON without markdown or explanations.',
].join('\n');

const mentorQuestionGuidance: Record<MentorProfileId, string[]> = {
  general: [
    'Ask about constraints, motivation, resources, and preferred pace.',
  ],
  programming: [
    'Ask about coding experience, stack, project idea, tools, and debugging comfort.',
  ],
  language_learning: [
    'Ask about current level, target skill, practice format, and speaking/listening/reading/writing balance.',
  ],
  fitness: [
    'Ask safety-first questions about experience, activity level, physical limitations, equipment, and recovery.',
  ],
  martial_arts: [
    'Ask safety-first questions about training experience, coach or supervised practice, protective gear, injuries, and practice space.',
  ],
  school_exam: [
    'Ask about subject, exam date, weak topics, practice results, and study resources.',
  ],
  music: [
    'Ask about instrument or voice experience, current songs or exercises, practice setup, and technique issues.',
  ],
  puzzle_logic: [
    'Ask about current method, level, practice time, known algorithms or strategies, and what feels hardest.',
  ],
  creative_skill: [
    'Ask about current skill level, preferred style, tools, project goal, and feedback habits.',
  ],
  business_project: [
    'Ask about audience, project idea, resources, timeline, adult support, and how success will be tested safely.',
  ],
};

function getLanguageName(language: AppLanguage) {
  return language === 'ru' ? 'Russian' : 'English';
}

function buildClarifyingQuestionsSystemPrompt(goal: Goal, language: AppLanguage) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);

  return [
    baseClarifyingQuestionsSystemPrompt,
    '',
    'Mentor profile context:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    `Use the mentor profile to make the questions specific. Write every question in ${getLanguageName(language)}.`,
    'Profile-specific question guidance:',
    ...mentorQuestionGuidance[mentorProfile.mentorProfileId],
  ].join('\n');
}

function formatPeriod(period: Goal['timePeriod'], language: AppLanguage) {
  if (language === 'ru') {
    return period === 'day' ? 'в день' : 'в неделю';
  }

  return period === 'day' ? 'per day' : 'per week';
}

function buildGoalContext(goal: Goal, language: AppLanguage) {
  return {
    available_time: `${goal.availableTime} ${language === 'ru' ? 'минут' : 'minutes'} ${formatPeriod(goal.timePeriod, language)}`,
    current_level: goal.currentLevel || (language === 'ru' ? 'не указано' : 'not provided'),
    description: goal.description || (language === 'ru' ? 'не указано' : 'not provided'),
    target_date: goal.targetDate,
    title: goal.title,
  };
}

function buildQuestionsPrompt(goal: Goal, language: AppLanguage) {
  const goalContext = buildGoalContext(goal, language);
  const languageName = getLanguageName(language);

  return [
    'Create 3 to 4 personalized customization questions for this goal.',
    `Questions and answerOptions must be short, clear, specific to the goal, and written in ${languageName}.`,
    'Every question must have responseKind "single_choice" and exactly 5 answerOptions.',
    'Options must be practical choices a teen can quickly pick. Avoid generic labels like Option A.',
    'For a cooking goal like pasta, ask about style, current comfort, ingredients/tools, taste preference, or serving goal.',
    'For each other goal type, make the questions and options directly associated with that exact goal.',
    'Focus on the missing details that would most improve the roadmap.',
    'Do not ask for the target date, available time, goal title, or current level if already provided.',
    'The response JSON must match this shape:',
    '{"questions":[{"question":"question text","responseKind":"single_choice","answerOptions":["answer 1","answer 2","answer 3","answer 4","answer 5"],"sortOrder":0}]}',
    'sortOrder must start at 0 and increase by 1.',
    '',
    `Goal data: ${JSON.stringify(goalContext, null, 2)}`,
  ].join('\n');
}

function buildFallbackAnswerOptions(goal: Goal, language: AppLanguage) {
  if (language === 'ru') {
    return [
      'Начать с самого простого варианта',
      'Сделать быстрый пробный шаг',
      'Разобрать цель на маленькие части',
      'Потренироваться с понятным примером',
      'Попросить наставника вести меня шаг за шагом',
    ];
  }

  return [
    `Start ${goal.title} from the easiest version`,
    'Try one quick practice step first',
    'Break the goal into tiny pieces',
    'Practice with a clear example',
    'Let the mentor guide me step by step',
  ];
}

export async function generateClarifyingQuestions(
  goal: Goal,
  language: AppLanguage,
): Promise<ClarifyingQuestion[]> {
  const aiText = await invokeAi({
    prompt: buildQuestionsPrompt(goal, language),
    system: buildClarifyingQuestionsSystemPrompt(goal, language),
  });
  const parsedResponse = parseAiJson(aiText);
  const validatedResponse = validateClarifyingQuestionsResponse(parsedResponse);

  return validatedResponse.questions.map((question, index) => ({
    answerOptions: question.responseKind === 'single_choice'
      ? question.answerOptions
      : buildFallbackAnswerOptions(goal, language),
    question: question.question,
    responseKind: 'single_choice',
    sortOrder: index,
  }));
}
