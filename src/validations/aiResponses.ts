import { z } from 'zod';
import { mentorProfileIds } from '../features/mentor/mentorProfiles';

const shortText = z.string().trim().min(1).max(500);
const longText = z.string().trim().min(1).max(3000);

export const clarifyingQuestionSchema = z
  .object({
    question: shortText,
    sortOrder: z.number().int().min(0),
  })
  .strict();

export const clarifyingQuestionsResponseSchema = z
  .object({
    questions: z.array(clarifyingQuestionSchema).min(5).max(6),
  })
  .strict();

export const feasibilitySchema = z
  .object({
    status: z.enum(['realistic', 'challenging', 'unrealistic']),
    explanation: longText,
  })
  .strict();

export const roadmapTaskSchema = z
  .object({
    title: shortText,
    description: longText,
    estimatedMinutes: z.number().int().min(5).max(480),
    suggestedDayOffset: z.number().int().min(0),
  })
  .strict();

export const roadmapStageSchema = z
  .object({
    title: shortText,
    description: longText,
    successCriteria: z.array(shortText).min(1).max(8),
    tasks: z.array(roadmapTaskSchema).min(1).max(30),
  })
  .strict();

export const roadmapResponseSchema = z
  .object({
    goalSummary: longText,
    feasibility: feasibilitySchema,
    mentorAdvice: longText,
    stages: z.array(roadmapStageSchema).min(1).max(12),
  })
  .strict();

export const goalAiAnalysisResponseSchema = z
  .object({
    clarificationQuestions: z.array(shortText).min(1).max(6),
    estimatedUserLevel: shortText,
    firstSmallAction: shortText,
    goalSummary: longText,
    steps: z.array(shortText).min(3).max(5),
  })
  .strict();

export const mentorProfileClassificationResponseSchema = z
  .object({
    confidence: z.number().min(0).max(1),
    mentorProfileId: z.enum(mentorProfileIds),
    reason: shortText,
  })
  .strict();

export const mentorResponseSchema = z
  .object({
    message: longText,
    suggestedActions: z.array(shortText).max(5).default([]),
    shouldSuggestPlanChange: z.boolean().default(false),
  })
  .strict();

export const planAdaptationChangeSchema = z
  .object({
    change: shortText,
    type: z.enum(['simplify', 'postpone', 'focus']),
  })
  .strict();

export const planAdaptationResponseSchema = z
  .object({
    explanation: longText,
    nextSmallAction: shortText,
    planChanges: z.array(planAdaptationChangeSchema).min(1).max(3),
  })
  .strict();

export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;
export type ClarifyingQuestionsResponse = z.infer<typeof clarifyingQuestionsResponseSchema>;
export type Feasibility = z.infer<typeof feasibilitySchema>;
export type GoalAiAnalysisResponse = z.infer<typeof goalAiAnalysisResponseSchema>;
export type MentorProfileClassificationResponse = z.infer<
  typeof mentorProfileClassificationResponseSchema
>;
export type RoadmapTask = z.infer<typeof roadmapTaskSchema>;
export type RoadmapStage = z.infer<typeof roadmapStageSchema>;
export type RoadmapResponse = z.infer<typeof roadmapResponseSchema>;
export type MentorResponse = z.infer<typeof mentorResponseSchema>;
export type PlanAdaptationChange = z.infer<typeof planAdaptationChangeSchema>;
export type PlanAdaptationResponse = z.infer<typeof planAdaptationResponseSchema>;

export class AiResponseValidationError extends Error {
  constructor(details: string[]) {
    super(`AI вернул данные в неправильном формате: ${details.join('; ')}`);
    this.name = 'AiResponseValidationError';
  }
}

function formatPath(path: Array<PropertyKey>) {
  return path.length > 0 ? path.join('.') : 'ответ';
}

function formatValidationIssues(error: z.ZodError) {
  return error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`);
}

function validateAiResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AiResponseValidationError(formatValidationIssues(result.error));
  }

  return result.data;
}

export function validateClarifyingQuestionsResponse(value: unknown) {
  return validateAiResponse(clarifyingQuestionsResponseSchema, value);
}

export function validateRoadmapResponse(value: unknown) {
  return validateAiResponse(roadmapResponseSchema, value);
}

export function validateGoalAiAnalysisResponse(value: unknown) {
  return validateAiResponse(goalAiAnalysisResponseSchema, value);
}

export function validateMentorProfileClassificationResponse(value: unknown) {
  return validateAiResponse(mentorProfileClassificationResponseSchema, value);
}

export function validateMentorResponse(value: unknown) {
  return validateAiResponse(mentorResponseSchema, value);
}

export function validatePlanAdaptationResponse(value: unknown) {
  return validateAiResponse(planAdaptationResponseSchema, value);
}
