import { supabase } from '../../lib/supabase';
import type { Goal, GoalStatus } from '../../types/goal';
import type {
  DailyGoalTask,
  RoadmapStage,
  RoadmapStageStatus,
  RoadmapTask,
  RoadmapTaskStatus,
  TaskDifficulty,
} from '../../types/roadmap';
import type { RoadmapResponse } from '../../validations/aiResponses';
import { calculateTaskXp, inferTaskXpInput } from './xp';

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
  difficulty: TaskDifficulty;
  due_date: string | null;
  estimated_minutes: number;
  goal_id: string;
  id: string;
  is_active_practice: boolean;
  is_important: boolean;
  is_passive: boolean;
  produces_result: boolean;
  sort_order: number;
  stage_id: string;
  status: RoadmapTaskStatus;
  title: string;
  updated_at: string;
  xp_awarded: number;
  xp_value: number;
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
  difficulty: TaskDifficulty;
  due_date: string | null;
  estimated_minutes: number;
  goal_id: string;
  is_active_practice: boolean;
  is_important: boolean;
  is_passive: boolean;
  produces_result: boolean;
  sort_order: number;
  stage_id: string;
  status: RoadmapTaskStatus;
  title: string;
  xp_awarded: number;
  xp_value: number;
};

type CompleteTaskResult = {
  goalProgress: number;
  goalStatus: GoalStatus;
  stages: RoadmapStage[];
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
  difficulty,
  is_active_practice,
  produces_result,
  is_important,
  is_passive,
  xp_value,
  xp_awarded,
  due_date,
  sort_order,
  status,
  completed_at,
  created_at,
  updated_at
`;

const todayTaskColumns = `
  ${roadmapTaskColumns},
  goals!inner (
    title,
    progress
  )
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
    difficulty: row.difficulty,
    dueDate: row.due_date,
    estimatedMinutes: row.estimated_minutes,
    goalId: row.goal_id,
    id: row.id,
    isActivePractice: row.is_active_practice,
    isImportant: row.is_important,
    isPassive: row.is_passive,
    producesResult: row.produces_result,
    sortOrder: row.sort_order,
    stageId: row.stage_id,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
    xpAwarded: row.xp_awarded,
    xpValue: row.xp_value,
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

  // AI suggests offsets from today, but persisted due dates must never exceed the goal deadline.
  return dueDate > targetDate ? targetDate : dueDate;
}

function groupTasksByStage(tasks: RoadmapTask[]) {
  return tasks.reduce<Record<string, RoadmapTask[]>>((accumulator, task) => {
    accumulator[task.stageId] = [...(accumulator[task.stageId] ?? []), task];
    return accumulator;
  }, {});
}

function getGoalProgress(stages: RoadmapStage[]) {
  const tasks = stages.flatMap((stage) => stage.tasks);

  if (tasks.length === 0) {
    return 0;
  }

  const completedTasks = tasks.filter((task) => task.status === 'completed');

  return Math.round((completedTasks.length / tasks.length) * 100);
}

function getGoalStatus(progress: number): GoalStatus {
  return progress === 100 ? 'completed' : 'active';
}

function getStageStatus(stage: RoadmapStage, firstOpenStageId: string | null): RoadmapStageStatus {
  if (stage.tasks.length > 0 && stage.tasks.every((task) => task.status === 'completed')) {
    return 'completed';
  }

  return stage.id === firstOpenStageId ? 'active' : 'locked';
}

async function updateGoalProgress(goalId: string, progress: number) {
  const status = getGoalStatus(progress);
  const { error } = await supabase
    .from('goals')
    .update({ progress, status })
    .eq('id', goalId)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return status;
}

async function updateStageStatuses(stages: RoadmapStage[]) {
  const firstOpenStage = stages.find((stage) =>
    stage.tasks.some((task) => task.status !== 'completed'),
  );
  const updates = stages.map((stage) => {
    const nextStatus = getStageStatus(stage, firstOpenStage?.id ?? null);

    if (stage.status === nextStatus) {
      return Promise.resolve();
    }

    return supabase
      .from('roadmap_stages')
      .update({ status: nextStatus })
      .eq('id', stage.id)
      .eq('goal_id', stage.goalId)
      .select('id')
      .single()
      .then(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      });
  });

  await Promise.all(updates);
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
    stage.tasks.map((task, taskIndex) => {
      const xpInput = inferTaskXpInput({
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        title: task.title,
      });

      return {
        description: task.description,
        difficulty: xpInput.difficulty,
        due_date: getDueDate(goal.targetDate, task.suggestedDayOffset),
        estimated_minutes: task.estimatedMinutes,
        goal_id: goal.id,
        is_active_practice: xpInput.isActivePractice,
        is_important: xpInput.isImportant,
        is_passive: xpInput.isPassive,
        produces_result: xpInput.producesResult,
        sort_order: taskIndex,
        stage_id: insertedStages[stageIndex].id,
        status: 'todo',
        title: task.title,
        xp_awarded: 0,
        xp_value: calculateTaskXp(xpInput),
      };
    }),
  );

  const { error: tasksError } = await supabase.from('tasks').insert(taskPayload);

  if (tasksError) {
    // Roll back inserted stages because stages and tasks are created in separate Supabase calls.
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

export async function setRoadmapTaskCompletion(
  goalId: string,
  taskId: string,
  isCompleted: boolean,
): Promise<CompleteTaskResult> {
  const { data: currentTask, error: currentTaskError } = await supabase
    .from('tasks')
    .select('id, xp_value')
    .eq('id', taskId)
    .eq('goal_id', goalId)
    .single()
    .returns<{ id: string; xp_value: number }>();

  if (currentTaskError) {
    throw new Error(currentTaskError.message);
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      completed_at: isCompleted ? new Date().toISOString() : null,
      status: isCompleted ? 'completed' : 'todo',
      xp_awarded: isCompleted ? currentTask.xp_value : 0,
    })
    .eq('id', taskId)
    .eq('goal_id', goalId)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (isCompleted) {
    await supabase.from('progress_logs').insert({
      action: 'task_completed',
      goal_id: goalId,
      note: `${currentTask.xp_value} XP earned`,
      task_id: taskId,
    });
  }

  const stagesAfterTaskUpdate = await fetchRoadmap(goalId);
  await updateStageStatuses(stagesAfterTaskUpdate);

  // Fetch again after status updates so the UI receives the same stage state that is saved remotely.
  const stages = await fetchRoadmap(goalId);
  const goalProgress = getGoalProgress(stages);
  const goalStatus = await updateGoalProgress(goalId, goalProgress);

  return {
    goalProgress,
    goalStatus,
    stages,
  };
}

type DailyGoalTaskRow = RoadmapTaskRow & {
  goals: {
    progress: number;
    title: string;
  };
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isCompletedToday(task: RoadmapTask) {
  return Boolean(task.completedAt?.startsWith(getTodayIsoDate()));
}

function isDailyTask(task: RoadmapTask) {
  if (isCompletedToday(task)) {
    return true;
  }

  return task.status !== 'completed' && (!task.dueDate || task.dueDate <= getTodayIsoDate());
}

export async function fetchDailyGoalTasks(goalIds: string[]): Promise<DailyGoalTask[]> {
  if (goalIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(todayTaskColumns)
    .in('goal_id', goalIds)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .limit(120)
    .returns<DailyGoalTaskRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data
    .map((row) => ({
      ...mapTaskRow(row),
      goalProgress: row.goals.progress,
      goalTitle: row.goals.title,
    }))
    .filter(isDailyTask)
    .sort((first, second) => {
      if (first.status === 'completed' && second.status !== 'completed') {
        return 1;
      }

      if (first.status !== 'completed' && second.status === 'completed') {
        return -1;
      }

      return (first.dueDate ?? '9999-12-31').localeCompare(second.dueDate ?? '9999-12-31');
    })
    .slice(0, 6);
}

export async function setTaskImportance(
  goalId: string,
  taskId: string,
  isImportant: boolean,
): Promise<RoadmapTask> {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(roadmapTaskColumns)
    .eq('id', taskId)
    .eq('goal_id', goalId)
    .single()
    .returns<RoadmapTaskRow>();

  if (taskError) {
    throw new Error(taskError.message);
  }

  const xpValue = calculateTaskXp({
    difficulty: task.difficulty,
    isActivePractice: task.is_active_practice,
    isImportant,
    isPassive: task.is_passive,
    producesResult: task.produces_result,
  });

  const { data, error } = await supabase
    .from('tasks')
    .update({
      is_important: isImportant,
      xp_awarded: task.status === 'completed' ? xpValue : 0,
      xp_value: xpValue,
    })
    .eq('id', taskId)
    .eq('goal_id', goalId)
    .select(roadmapTaskColumns)
    .single()
    .returns<RoadmapTaskRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTaskRow(data);
}
