import { supabase } from '../../lib/supabase';
import type { ClarifyingQuestion } from '../../validations/aiResponses';
import type {
  GoalQuestion,
  GoalQuestionAnswerInput,
  GoalQuestionResponseKind,
} from '../../types/goalQuestion';

type GoalQuestionRow = {
  answer: string | null;
  answer_options: string[] | null;
  created_at: string;
  goal_id: string;
  id: string;
  question: string;
  response_kind: GoalQuestionResponseKind;
  selected_option_index: number | null;
  sort_order: number;
};

type CreateGoalQuestionRow = {
  answer_options: string[] | null;
  goal_id: string;
  question: string;
  response_kind: GoalQuestionResponseKind;
  sort_order: number;
};

const goalQuestionColumns = `
  id,
  goal_id,
  question,
  answer,
  answer_options,
  response_kind,
  selected_option_index,
  sort_order,
  created_at
`;

function mapGoalQuestionRow(row: GoalQuestionRow): GoalQuestion {
  return {
    answer: row.answer ?? '',
    answerOptions: row.answer_options ?? [],
    createdAt: row.created_at,
    goalId: row.goal_id,
    id: row.id,
    question: row.question,
    responseKind: row.response_kind,
    selectedOptionIndex: row.selected_option_index,
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
  const existingQuestions = await fetchGoalQuestions(goalId);

  if (existingQuestions.length > 0) {
    return sortQuestions(existingQuestions);
  }

  const payload: CreateGoalQuestionRow[] = [...questions]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((question, index) => ({
      answer_options: question.responseKind === 'single_choice' ? question.answerOptions : null,
      goal_id: goalId,
      question: question.question,
      response_kind: question.responseKind ?? 'free_text',
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
  const questionsById = new Map((await fetchGoalQuestions(goalId)).map((question) => [question.id, question]));

  const updates = answers.map(async ({ answer, id, selectedOptionIndex }) => {
    const question = questionsById.get(id);

    if (!question) {
      throw new Error('Question not found.');
    }

    const normalizedSelectedOptionIndex =
      question.responseKind === 'single_choice'
        ? selectedOptionIndex ?? null
        : null;

    if (
      normalizedSelectedOptionIndex !== null
      && (normalizedSelectedOptionIndex < 0
        || normalizedSelectedOptionIndex >= question.answerOptions.length)
    ) {
      throw new Error('Selected answer option is out of range.');
    }

    const normalizedAnswer =
      question.responseKind === 'single_choice' && normalizedSelectedOptionIndex !== null
        ? question.answerOptions[normalizedSelectedOptionIndex] ?? ''
        : answer.trim();

    const { error } = await supabase
      .from('goal_questions')
      .update({
        answer: normalizedAnswer || null,
        selected_option_index: normalizedSelectedOptionIndex,
      })
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
