export type GoalQuestionResponseKind = 'free_text' | 'single_choice';

export type GoalQuestion = {
  answer: string;
  answerOptions: string[];
  createdAt: string;
  goalId: string;
  id: string;
  question: string;
  responseKind: GoalQuestionResponseKind;
  selectedOptionIndex: number | null;
  sortOrder: number;
};

export type GoalQuestionAnswerInput = {
  answer: string;
  id: string;
  selectedOptionIndex?: number | null;
};
