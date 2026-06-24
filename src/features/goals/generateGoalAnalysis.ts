import { invokeAi, parseAiJson } from '../../lib/ai';
import type { AppLanguage } from '../../lib/language';
import type { CreateGoalInput } from '../../types/goal';
import type { GoalAiAnalysisResponse } from '../../validations/aiResponses';
import { validateGoalAiAnalysisResponse } from '../../validations/aiResponses';

function getLanguageName(language: AppLanguage) {
  return language === 'ru' ? 'Russian' : 'English';
}

function getGoalAnalysisSystemPrompt(language: AppLanguage) {
  return [
  'You are a practical AI mentor for a 14-16 year old learner.',
  'Help turn the user goal into a simple first plan.',
  `Write in ${getLanguageName(language)}, briefly and friendly.`,
  'Do not invent facts the user did not provide.',
  'Return only valid JSON without markdown or explanations.',
  ].join('\n');
}

function formatPeriod(period: CreateGoalInput['timePeriod'], language: AppLanguage) {
  if (language === 'ru') {
    return period === 'day' ? 'в день' : 'в неделю';
  }

  return period === 'day' ? 'per day' : 'per week';
}

function buildGoalAnalysisPrompt(input: CreateGoalInput, language: AppLanguage) {
  const goalContext = {
    available_time: `${input.availableTime} ${language === 'ru' ? 'минут' : 'minutes'} ${formatPeriod(input.timePeriod, language)}`,
    current_level: input.currentLevel || (language === 'ru' ? 'не указано' : 'not provided'),
    description: input.description || (language === 'ru' ? 'не указано' : 'not provided'),
    target_date: input.targetDate,
    title: input.title,
  };

  return [
    'Analyze the user goal and create a short starter AI response.',
    'goalSummary - a brief summary of the goal and desired result.',
    'estimatedUserLevel - the likely user level based only on provided data.',
    'steps - 3 to 5 clear steps.',
    'clarificationQuestions - short questions that would help refine the plan.',
    'firstSmallAction - one small action the user can do today in 10-30 minutes.',
    'firstSmallAction must be hands-on and produce a visible result for the goal.',
    'Never make firstSmallAction a research-only task like "Search online", "Google", "Look up", or "Watch videos".',
    'If the goal is cooking, firstSmallAction should be cooking or preparation, not searching for a recipe.',
    'The response JSON must match this shape:',
    '{"goalSummary":"...","estimatedUserLevel":"...","steps":["...","...","..."],"clarificationQuestions":["..."],"firstSmallAction":"..."}',
    '',
    `Goal data: ${JSON.stringify(goalContext, null, 2)}`,
  ].join('\n');
}

export async function generateGoalAnalysis(
  input: CreateGoalInput,
  language: AppLanguage,
): Promise<GoalAiAnalysisResponse> {
  const aiText = await invokeAi({
    prompt: buildGoalAnalysisPrompt(input, language),
    system: getGoalAnalysisSystemPrompt(language),
  });
  const parsedResponse = parseAiJson(aiText);

  return validateGoalAiAnalysisResponse(parsedResponse);
}
