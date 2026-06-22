import { supabase } from '../../lib/supabase';
import type {
  CreateGoalInput,
  Goal,
  GoalAiAnalysis,
  GoalStatus,
  GoalSummary,
  TimePeriod,
} from '../../types/goal';
import type { MentorProfileId } from '../mentor/mentorProfiles';
import type { GoalAiAnalysisResponse } from '../../validations/aiResponses';

type GoalRow = {
  available_time: number;
  created_at: string;
  current_level: string;
  description: string;
  id: string;
  mentor_profile_id: MentorProfileId;
  progress: number;
  status: GoalStatus;
  target_date: string;
  time_period: TimePeriod;
  title: string;
  updated_at: string;
  user_id: string;
};

type CreateGoalRow = {
  available_time: number;
  current_level: string;
  description: string;
  mentor_profile_id: MentorProfileId;
  status: GoalStatus;
  target_date: string;
  time_period: TimePeriod;
  title: string;
  user_id: string;
};

type TaskPreviewRow = {
  goal_id: string;
  id: string;
  title: string;
};

type GoalAiAnalysisRow = {
  clarification_questions: string[];
  created_at: string;
  estimated_user_level: string;
  first_small_action: string;
  goal_id: string;
  goal_summary: string;
  id: string;
  steps: string[];
  user_id: string;
};

type CreateGoalAiAnalysisRow = {
  clarification_questions: string[];
  estimated_user_level: string;
  first_small_action: string;
  goal_id: string;
  goal_summary: string;
  raw_response: GoalAiAnalysisResponse;
  steps: string[];
  user_id: string;
};

const goalColumns = `
  id,
  user_id,
  title,
  description,
  target_date,
  available_time,
  time_period,
  current_level,
  mentor_profile_id,
  status,
  progress,
  created_at,
  updated_at
`;

const taskPreviewColumns = `
  goal_id,
  id,
  title
`;

const goalAiAnalysisColumns = `
  id,
  goal_id,
  user_id,
  goal_summary,
  estimated_user_level,
  steps,
  clarification_questions,
  first_small_action,
  created_at
`;

function mapGoalRow(row: GoalRow): Goal {
  return {
    availableTime: row.available_time,
    createdAt: row.created_at,
    currentLevel: row.current_level,
    description: row.description,
    id: row.id,
    mentorProfileId: row.mentor_profile_id,
    progress: row.progress,
    status: row.status,
    targetDate: row.target_date,
    timePeriod: row.time_period,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function mapGoalAiAnalysisRow(row: GoalAiAnalysisRow): GoalAiAnalysis {
  return {
    clarificationQuestions: row.clarification_questions,
    createdAt: row.created_at,
    estimatedUserLevel: row.estimated_user_level,
    firstSmallAction: row.first_small_action,
    goalId: row.goal_id,
    goalSummary: row.goal_summary,
    id: row.id,
    steps: row.steps,
    userId: row.user_id,
  };
}

async function fetchGoalAiAnalyses(goalIds: string[]) {
  if (goalIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('goal_ai_responses')
    .select(goalAiAnalysisColumns)
    .in('goal_id', goalIds)
    .returns<GoalAiAnalysisRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.reduce<Record<string, GoalAiAnalysis>>((analyses, analysis) => {
    analyses[analysis.goal_id] = mapGoalAiAnalysisRow(analysis);

    return analyses;
  }, {});
}

async function createGoalAiAnalysis(
  userId: string,
  goalId: string,
  analysis: GoalAiAnalysisResponse,
) {
  const payload: CreateGoalAiAnalysisRow = {
    clarification_questions: analysis.clarificationQuestions,
    estimated_user_level: analysis.estimatedUserLevel,
    first_small_action: analysis.firstSmallAction,
    goal_id: goalId,
    goal_summary: analysis.goalSummary,
    raw_response: analysis,
    steps: analysis.steps,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('goal_ai_responses')
    .insert(payload)
    .select(goalAiAnalysisColumns)
    .single()
    .returns<GoalAiAnalysisRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapGoalAiAnalysisRow(data);
}

export async function fetchGoals(userId: string): Promise<GoalSummary[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(goalColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<GoalRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const goals = data.map(mapGoalRow);
  const goalIds = goals.map((goal) => goal.id);

  if (goalIds.length === 0) {
    return goals;
  }

  const aiAnalysisByGoalId = await fetchGoalAiAnalyses(goalIds);
  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select(taskPreviewColumns)
    .in('goal_id', goalIds)
    .neq('status', 'completed')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .returns<TaskPreviewRow[]>();

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const taskByGoalId = taskRows.reduce<Record<string, TaskPreviewRow>>((tasks, task) => {
    // Rows are ordered by due date and sort order, so the first task becomes the dashboard preview.
    if (!tasks[task.goal_id]) {
      tasks[task.goal_id] = task;
    }

    return tasks;
  }, {});

  return goals.map<GoalSummary>((goal) => {
    const task = taskByGoalId[goal.id];
    const aiAnalysis = aiAnalysisByGoalId[goal.id];

    if (!task && !aiAnalysis) {
      return goal;
    }

    return {
      ...goal,
      aiAnalysis,
      todayTask: task
        ? {
            id: task.id,
            title: task.title,
          }
        : undefined,
    };
  });
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  aiAnalysis: GoalAiAnalysisResponse,
  mentorProfileId: MentorProfileId,
): Promise<GoalSummary> {
  const payload: CreateGoalRow = {
    available_time: input.availableTime,
    current_level: input.currentLevel,
    description: input.description,
    mentor_profile_id: mentorProfileId,
    status: 'draft',
    target_date: input.targetDate,
    time_period: input.timePeriod,
    title: input.title,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('goals')
    .insert(payload)
    .select(goalColumns)
    .single()
    .returns<GoalRow>();

  if (error) {
    throw new Error(error.message);
  }

  const goal = mapGoalRow(data);

  try {
    const savedAiAnalysis = await createGoalAiAnalysis(userId, goal.id, aiAnalysis);

    return {
      ...goal,
      aiAnalysis: savedAiAnalysis,
    };
  } catch (caughtError) {
    // Keep goal creation atomic from the user's perspective if the companion AI row fails to save.
    await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', userId);
    throw caughtError;
  }
}

export async function deleteGoal(userId: string, goalId: string) {
  const { data, error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Goal not found or already deleted.');
  }
}
