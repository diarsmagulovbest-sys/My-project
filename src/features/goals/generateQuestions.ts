import { invokeAi, parseAiJson } from '../../lib/ai';
import type { Goal } from '../../types/goal';
import type { ClarifyingQuestion } from '../../validations/aiResponses';
import { validateClarifyingQuestionsResponse } from '../../validations/aiResponses';
import {
  getMentorProfile,
  getMentorProfileSystemContext,
  type MentorProfileId,
} from '../mentor/mentorProfiles';

const baseClarifyingQuestionsSystemPrompt = [
  'Ты продуктовый AI-наставник для подростка 14-16 лет.',
  'Твоя задача - задать короткие уточняющие вопросы, чтобы потом составить точный план достижения цели.',
  'Не повторяй информацию, которая уже известна из цели.',
  'Не создавай roadmap, этапы или задачи.',
  'Верни только валидный JSON без markdown и без пояснений.',
].join('\n');

const mentorQuestionGuidance: Record<MentorProfileId, string[]> = {
  general: [
    'Ask about the learner goal, constraints, motivation, resources, and preferred pace.',
  ],
  programming: [
    'Ask about coding experience, programming language or stack, project idea, tools, device access, and debugging comfort.',
  ],
  language_learning: [
    'Ask about current language level, target skill, practice format, preferred topics, and speaking/listening/reading/writing balance.',
  ],
  fitness: [
    'Ask safety-first questions about experience, current activity level, physical limitations, available equipment, rest, and training environment.',
  ],
  martial_arts: [
    'Ask safety-first questions about prior training, coach or supervised practice, protective gear, injuries or limitations, and realistic practice space.',
  ],
  school_exam: [
    'Ask about subject, exam date, weak topics, current grades or practice results, study resources, and available review time.',
  ],
  music: [
    'Ask about instrument or voice experience, current songs or exercises, practice setup, technique issues, and performance goals.',
  ],
  puzzle_logic: [
    'Ask about current method, current level, practice time, known algorithms or strategies, speed goals, and what feels hardest.',
  ],
  creative_skill: [
    'Ask about current skill level, preferred style, tools, references, project goal, and feedback habits.',
  ],
  business_project: [
    'Ask about audience, project idea, resources, timeline, adult support, budget constraints, and how success will be tested safely.',
  ],
};

function buildClarifyingQuestionsSystemPrompt(goal: Goal) {
  const mentorProfile = getMentorProfile(goal.mentorProfileId);

  return [
    baseClarifyingQuestionsSystemPrompt,
    '',
    'Mentor profile context:',
    getMentorProfileSystemContext(goal.mentorProfileId),
    '',
    'Use the mentor profile to make the questions more specific, while keeping every question in Russian.',
    'Profile-specific question guidance:',
    ...mentorQuestionGuidance[mentorProfile.mentorProfileId],
  ].join('\n');
}

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
    system: buildClarifyingQuestionsSystemPrompt(goal),
  });
  const parsedResponse = parseAiJson(aiText);
  const validatedResponse = validateClarifyingQuestionsResponse(parsedResponse);

  return validatedResponse.questions.map((question, index) => ({
    question: question.question,
    sortOrder: index,
  }));
}
