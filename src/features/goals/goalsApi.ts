import { supabase } from '../../lib/supabase';
import type { CreateGoalInput, Goal, GoalStatus, TimePeriod } from '../../types/goal';

type GoalRow = {
  available_time: number;
  created_at: string;
  current_level: string;
  description: string;
  id: string;
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
  status: GoalStatus;
  target_date: string;
  time_period: TimePeriod;
  title: string;
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
  status,
  progress,
  created_at,
  updated_at
`;

function mapGoalRow(row: GoalRow): Goal {
  return {
    availableTime: row.available_time,
    createdAt: row.created_at,
    currentLevel: row.current_level,
    description: row.description,
    id: row.id,
    progress: row.progress,
    status: row.status,
    targetDate: row.target_date,
    timePeriod: row.time_period,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(goalColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<GoalRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapGoalRow);
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  const payload: CreateGoalRow = {
    available_time: input.availableTime,
    current_level: input.currentLevel,
    description: input.description,
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

  return mapGoalRow(data);
}
