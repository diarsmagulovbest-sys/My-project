import type { MentorProfileId } from '../features/mentor/mentorProfiles';

export type TimePeriod = 'day' | 'week';

export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type Goal = {
  availableTime: number;
  createdAt: string;
  currentLevel: string;
  description: string;
  id: string;
  mentorProfileId: MentorProfileId;
  progress: number;
  status: GoalStatus;
  targetDate: string;
  timePeriod: TimePeriod;
  title: string;
  updatedAt: string;
  userId: string;
};

export type GoalAiAnalysis = {
  clarificationQuestions: string[];
  createdAt: string;
  estimatedUserLevel: string;
  firstSmallAction: string;
  goalId: string;
  goalSummary: string;
  id: string;
  steps: string[];
  userId: string;
};

export type GoalTaskPreview = {
  id: string;
  title: string;
};

export type GoalSummary = Goal & {
  aiAnalysis?: GoalAiAnalysis;
  todayTask?: GoalTaskPreview;
};

export type CreateGoalInput = {
  availableTime: number;
  currentLevel: string;
  description: string;
  targetDate: string;
  timePeriod: TimePeriod;
  title: string;
};
