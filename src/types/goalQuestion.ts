export type GoalQuestion = {
  answer: string;
  createdAt: string;
  goalId: string;
  id: string;
  question: string;
  sortOrder: number;
};

export type GoalQuestionAnswerInput = {
  answer: string;
  id: string;
};
