export type RoadmapStageStatus = 'locked' | 'active' | 'completed';

export type RoadmapTaskStatus = 'todo' | 'in_progress' | 'completed' | 'skipped';

export type RoadmapTask = {
  completedAt: string | null;
  createdAt: string;
  description: string;
  dueDate: string | null;
  estimatedMinutes: number;
  goalId: string;
  id: string;
  sortOrder: number;
  stageId: string;
  status: RoadmapTaskStatus;
  title: string;
  updatedAt: string;
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
