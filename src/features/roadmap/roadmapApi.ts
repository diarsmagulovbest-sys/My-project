import { supabase } from '../../lib/supabase';
import type { Goal } from '../../types/goal';
import type {
  RoadmapStage,
  RoadmapStageStatus,
  RoadmapTask,
  RoadmapTaskStatus,
} from '../../types/roadmap';
import type { RoadmapResponse } from '../../validations/aiResponses';

type RoadmapStageRow = {
  created_at: string;
  description: string;
  goal_id: string;
  id: string;
  sort_order: number;
  status: RoadmapStageStatus;
  success_criteria: unknown;
  title: string;
};

type RoadmapTaskRow = {
  completed_at: string | null;
  created_at: string;
  description: string;
  due_date: string | null;
  estimated_minutes: number;
  goal_id: string;
  id: string;
  sort_order: number;
  stage_id: string;
  status: RoadmapTaskStatus;
  title: string;
  updated_at: string;
};

type CreateRoadmapStageRow = {
  description: string;
  goal_id: string;
  sort_order: number;
  status: RoadmapStageStatus;
  success_criteria: string[];
  title: string;
};

type CreateRoadmapTaskRow = {
  description: string;
  due_date: string | null;
  estimated_minutes: number;
  goal_id: string;
  sort_order: number;
  stage_id: string;
  status: RoadmapTaskStatus;
  title: string;
};

const roadmapStageColumns = `
  id,
  goal_id,
  title,
  description,
  success_criteria,
  sort_order,
  status,
  created_at
`;

const roadmapTaskColumns = `
  id,
  goal_id,
  stage_id,
  title,
  description,
  estimated_minutes,
  due_date,
  sort_order,
  status,
  completed_at,
  created_at,
  updated_at
`;

function mapSuccessCriteria(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function mapTaskRow(row: RoadmapTaskRow): RoadmapTask {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    description: row.description,
    dueDate: row.due_date,
    estimatedMinutes: row.estimated_minutes,
    goalId: row.goal_id,
    id: row.id,
    sortOrder: row.sort_order,
    stageId: row.stage_id,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapStageRow(row: RoadmapStageRow, tasks: RoadmapTask[]): RoadmapStage {
  return {
    createdAt: row.created_at,
    description: row.description,
    goalId: row.goal_id,
    id: row.id,
    sortOrder: row.sort_order,
    status: row.status,
    successCriteria: mapSuccessCriteria(row.success_criteria),
    tasks,
    title: row.title,
  };
}

function addDays(startDate: string, days: number) {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDueDate(targetDate: string, suggestedDayOffset: number) {
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = addDays(today, suggestedDayOffset);

  return dueDate > targetDate ? targetDate : dueDate;
}

function groupTasksByStage(tasks: RoadmapTask[]) {
  return tasks.reduce<Record<string, RoadmapTask[]>>((accumulator, task) => {
    accumulator[task.stageId] = [...(accumulator[task.stageId] ?? []), task];
    return accumulator;
  }, {});
}

export async function fetchRoadmap(goalId: string): Promise<RoadmapStage[]> {
  const { data: stageRows, error: stagesError } = await supabase
    .from('roadmap_stages')
    .select(roadmapStageColumns)
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
    .returns<RoadmapStageRow[]>();

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  if (stageRows.length === 0) {
    return [];
  }

  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select(roadmapTaskColumns)
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
    .returns<RoadmapTaskRow[]>();

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const tasksByStage = groupTasksByStage(taskRows.map(mapTaskRow));

  return stageRows.map((stage) => mapStageRow(stage, tasksByStage[stage.id] ?? []));
}

export async function createRoadmap(goal: Goal, roadmap: RoadmapResponse): Promise<RoadmapStage[]> {
  const stagePayload: CreateRoadmapStageRow[] = roadmap.stages.map((stage, index) => ({
    description: stage.description,
    goal_id: goal.id,
    sort_order: index,
    status: index === 0 ? 'active' : 'locked',
    success_criteria: stage.successCriteria,
    title: stage.title,
  }));

  const { data: insertedStages, error: stagesError } = await supabase
    .from('roadmap_stages')
    .insert(stagePayload)
    .select(roadmapStageColumns)
    .returns<RoadmapStageRow[]>();

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  const taskPayload: CreateRoadmapTaskRow[] = roadmap.stages.flatMap((stage, stageIndex) =>
    stage.tasks.map((task, taskIndex) => ({
      description: task.description,
      due_date: getDueDate(goal.targetDate, task.suggestedDayOffset),
      estimated_minutes: task.estimatedMinutes,
      goal_id: goal.id,
      sort_order: taskIndex,
      stage_id: insertedStages[stageIndex].id,
      status: 'todo',
      title: task.title,
    })),
  );

  const { error: tasksError } = await supabase.from('tasks').insert(taskPayload);

  if (tasksError) {
    await supabase
      .from('roadmap_stages')
      .delete()
      .eq('goal_id', goal.id)
      .in(
        'id',
        insertedStages.map((stage) => stage.id),
      );
    throw new Error(tasksError.message);
  }

  return fetchRoadmap(goal.id);
}
