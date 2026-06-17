import { supabase } from '../../lib/supabase';
import type { ClarifyingQuestion } from '../../validations/aiResponses';
import type { GoalQuestion, GoalQuestionAnswerInput } from '../../types/goalQuestion';

type GoalQuestionRow = {
  answer: string | null;
  created_at: string;
  goal_id: string;
  id: string;
  question: string;
  sort_order: number;
};

type CreateGoalQuestionRow = {
  goal_id: string;
  question: string;
  sort_order: number;
};

const goalQuestionColumns = `
  id,
  goal_id,
  question,
  answer,
  sort_order,
  created_at
`;

function mapGoalQuestionRow(row: GoalQuestionRow): GoalQuestion {
  return {
    answer: row.answer ?? '',
    createdAt: row.created_at,
    goalId: row.goal_id,
    id: row.id,
    question: row.question,
    sortOrder: row.sort_order,
  };
}

function sortQuestions(questions: GoalQuestion[]) {
  return [...questions].sort((first, second) => first.sortOrder - second.sortOrder);
}

export async function fetchGoalQuestions(goalId: string): Promise<GoalQuestion[]> {
  const { data, error } = await supabase
    .from('goal_questions')
    .select(goalQuestionColumns)
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
    .returns<GoalQuestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapGoalQuestionRow);
}

export async function createGoalQuestions(
  goalId: string,
  questions: ClarifyingQuestion[],
): Promise<GoalQuestion[]> {
  const payload: CreateGoalQuestionRow[] = [...questions]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((question, index) => ({
      goal_id: goalId,
      question: question.question,
      sort_order: index,
    }));

  const { data, error } = await supabase
    .from('goal_questions')
    .insert(payload)
    .select(goalQuestionColumns)
    .returns<GoalQuestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return sortQuestions(data.map(mapGoalQuestionRow));
}

export async function saveGoalQuestionAnswers(
  goalId: string,
  answers: GoalQuestionAnswerInput[],
): Promise<GoalQuestion[]> {
  const updates = answers.map(async ({ answer, id }) => {
    const { error } = await supabase
      .from('goal_questions')
      .update({ answer: answer.trim() || null })
      .eq('id', id)
      .eq('goal_id', goalId)
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }
  });

  await Promise.all(updates);

  return fetchGoalQuestions(goalId);
}
