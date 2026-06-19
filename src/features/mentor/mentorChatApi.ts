import { supabase } from '../../lib/supabase';
import type { Goal } from '../../types/goal';
import type {
  MentorConversation,
  MentorMessage,
  MentorMessageRole,
  ProgressLog,
} from '../../types/mentorChat';

type MentorConversationRow = {
  created_at: string;
  goal_id: string;
  id: string;
  updated_at: string;
  user_id: string;
};

type MentorMessageRow = {
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  role: MentorMessageRole;
};

type ProgressLogRow = {
  action: string;
  created_at: string;
  goal_id: string;
  id: string;
  note: string;
  task_id: string | null;
  user_id: string;
};

const conversationColumns = `
  id,
  goal_id,
  user_id,
  created_at,
  updated_at
`;

const messageColumns = `
  id,
  conversation_id,
  role,
  content,
  created_at
`;

const progressLogColumns = `
  id,
  goal_id,
  task_id,
  user_id,
  action,
  note,
  created_at
`;

function mapConversationRow(row: MentorConversationRow): MentorConversation {
  return {
    createdAt: row.created_at,
    goalId: row.goal_id,
    id: row.id,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function mapMessageRow(row: MentorMessageRow): MentorMessage {
  return {
    content: row.content,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    id: row.id,
    role: row.role,
  };
}

function mapProgressLogRow(row: ProgressLogRow): ProgressLog {
  return {
    action: row.action,
    createdAt: row.created_at,
    goalId: row.goal_id,
    id: row.id,
    note: row.note,
    taskId: row.task_id,
    userId: row.user_id,
  };
}

export async function getOrCreateMentorConversation(goal: Goal) {
  const { data: existingRows, error: fetchError } = await supabase
    .from('conversations')
    .select(conversationColumns)
    .eq('goal_id', goal.id)
    .eq('user_id', goal.userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .returns<MentorConversationRow[]>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingConversation = existingRows[0];

  if (existingConversation) {
    return mapConversationRow(existingConversation);
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      goal_id: goal.id,
      user_id: goal.userId,
    })
    .select(conversationColumns)
    .single()
    .returns<MentorConversationRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapConversationRow(data);
}

export async function fetchMentorMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(messageColumns)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .returns<MentorMessageRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapMessageRow);
}

export async function createMentorMessage(
  conversationId: string,
  role: Exclude<MentorMessageRole, 'system'>,
  content: string,
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      content,
      conversation_id: conversationId,
      role,
    })
    .select(messageColumns)
    .single()
    .returns<MentorMessageRow>();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return mapMessageRow(data);
}

export async function fetchRecentProgressLogs(goalId: string) {
  const { data, error } = await supabase
    .from('progress_logs')
    .select(progressLogColumns)
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<ProgressLogRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapProgressLogRow);
}
