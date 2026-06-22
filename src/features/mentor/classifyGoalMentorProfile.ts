import { invokeAi, parseAiJson } from '../../lib/ai';
import type { CreateGoalInput } from '../../types/goal';
import type { MentorProfileClassificationResponse } from '../../validations/aiResponses';
import { validateMentorProfileClassificationResponse } from '../../validations/aiResponses';
import { getDefaultMentorProfile, mentorProfileIds, mentorProfiles } from './mentorProfiles';

export type ClassifyGoalMentorProfileInput = Pick<
  CreateGoalInput,
  'availableTime' | 'currentLevel' | 'description' | 'targetDate' | 'timePeriod' | 'title'
>;

export type ClassifyGoalMentorProfileResult = MentorProfileClassificationResponse;

const minimumConfidence = 0.6;

const mentorProfileClassificationSystemPrompt = [
  'You classify a learner goal into exactly one mentor profile.',
  'Use only the allowed mentorProfileId values.',
  'If the category is unclear, too broad, or low-confidence, choose general.',
  'Do not invent details that are not present in the goal.',
  'Return only valid JSON without markdown or explanations.',
  'The JSON must match this exact shape:',
  '{"mentorProfileId":"programming","confidence":0.86,"reason":"The goal is about learning software development."}',
  `Allowed mentorProfileId values: ${mentorProfileIds.join(', ')}.`,
].join('\n');

function getFallbackClassification(): ClassifyGoalMentorProfileResult {
  const defaultProfile = getDefaultMentorProfile();

  return {
    confidence: 0,
    mentorProfileId: defaultProfile.mentorProfileId,
    reason: 'The goal could not be classified safely, so the general mentor profile was selected.',
  };
}

function formatPeriod(period: CreateGoalInput['timePeriod']) {
  return period === 'day' ? 'per day' : 'per week';
}

function buildProfileOptionsContext() {
  return mentorProfileIds.map((mentorProfileId) => {
    const profile = mentorProfiles[mentorProfileId];

    return {
      description: profile.description,
      exampleGoals: profile.exampleGoals,
      mentorProfileId: profile.mentorProfileId,
    };
  });
}

function buildClassificationPrompt(input: ClassifyGoalMentorProfileInput) {
  const goalContext = {
    available_time: `${input.availableTime} minutes ${formatPeriod(input.timePeriod)}`,
    current_level: input.currentLevel || 'not provided',
    description: input.description || 'not provided',
    target_date: input.targetDate,
    title: input.title,
  };

  return [
    'Choose the best mentor profile for this learner goal.',
    `If confidence would be below ${minimumConfidence}, choose general.`,
    'Return a short reason in English.',
    '',
    `Available mentor profiles: ${JSON.stringify(buildProfileOptionsContext(), null, 2)}`,
    `Goal data: ${JSON.stringify(goalContext, null, 2)}`,
  ].join('\n');
}

export async function classifyGoalMentorProfile(
  input: ClassifyGoalMentorProfileInput,
): Promise<ClassifyGoalMentorProfileResult> {
  try {
    const aiText = await invokeAi({
      prompt: buildClassificationPrompt(input),
      system: mentorProfileClassificationSystemPrompt,
    });
    const parsedResponse = parseAiJson(aiText);
    const validatedResponse = validateMentorProfileClassificationResponse(parsedResponse);

    if (validatedResponse.confidence < minimumConfidence) {
      return getFallbackClassification();
    }

    return validatedResponse;
  } catch {
    // Profile classification is optional personalization; callers can safely continue with general.
    return getFallbackClassification();
  }
}
