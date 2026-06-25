export type RoadmapStageStatus = 'locked' | 'active' | 'completed';

export type RoadmapTaskStatus = 'todo' | 'in_progress' | 'completed' | 'skipped';
export type TaskDifficulty = 'tiny' | 'easy' | 'medium' | 'hard' | 'major' | 'milestone';

export type TaskXpInput = {
  difficulty: TaskDifficulty;
  isActivePractice: boolean;
  isImportant: boolean;
  isPassive: boolean;
  producesResult: boolean;
};

export type RoadmapTask = {
  completedAt: string | null;
  createdAt: string;
  description: string;
  difficulty: TaskDifficulty;
  dueDate: string | null;
  estimatedMinutes: number;
  goalId: string;
  id: string;
  isActivePractice: boolean;
  isImportant: boolean;
  isPassive: boolean;
  producesResult: boolean;
  sortOrder: number;
  stageId: string;
  status: RoadmapTaskStatus;
  title: string;
  updatedAt: string;
  xpAwarded: number;
  xpValue: number;
};

export type RoadmapStage = {
  createdAt: string;
  description: string;
  goalId: string;
  id: string;
  sortOrder: number;
  status: RoadmapStageStatus;
  successCriteria: string[];
  tasks: RoadmapTask[];
  title: string;
};

export type DailyGoalTask = RoadmapTask & {
  goalProgress: number;
  goalTitle: string;
};
