export type MentorMessageRole = 'user' | 'assistant' | 'system';

export type MentorConversation = {
  createdAt: string;
  goalId: string;
  id: string;
  updatedAt: string;
  userId: string;
};

export type MentorMessage = {
  content: string;
  conversationId: string;
  createdAt: string;
  id: string;
  role: MentorMessageRole;
};

export type ProgressLog = {
  action: string;
  createdAt: string;
  goalId: string;
  id: string;
  note: string;
  taskId: string | null;
  userId: string;
};
