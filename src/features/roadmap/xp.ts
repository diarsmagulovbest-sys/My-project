import type { TaskDifficulty, TaskXpInput } from '../../types/roadmap';

export const taskDifficultyBaseXp: Record<TaskDifficulty, number> = {
  tiny: 5,
  easy: 10,
  medium: 20,
  hard: 35,
  major: 50,
  milestone: 75,
};

const passivePattern = /\b(read|watch|listen|search|google|look up|review|study|learn about|tutorial|video)\b/i;
const activePracticePattern =
  /\b(practice|solve|build|create|make|cook|write|code|debug|record|test|speak|draw|design|repeat|drill|implement)\b/i;
const realResultPattern =
  /\b(finish|submit|share|ship|build|create|make|write|cook|solve|record|draft|prototype|complete|publish)\b/i;

export function inferTaskDifficulty(estimatedMinutes: number): TaskDifficulty {
  if (estimatedMinutes <= 10) {
    return 'tiny';
  }

  if (estimatedMinutes <= 20) {
    return 'easy';
  }

  if (estimatedMinutes <= 45) {
    return 'medium';
  }

  if (estimatedMinutes <= 90) {
    return 'hard';
  }

  if (estimatedMinutes <= 180) {
    return 'major';
  }

  return 'milestone';
}

export function inferTaskXpInput(task: {
  description: string;
  estimatedMinutes: number;
  title: string;
}): TaskXpInput {
  const taskText = `${task.title} ${task.description}`;
  const isActivePractice = activePracticePattern.test(taskText);
  const producesResult = realResultPattern.test(taskText);
  const isPassive = passivePattern.test(taskText) && !isActivePractice && !producesResult;

  return {
    difficulty: inferTaskDifficulty(task.estimatedMinutes),
    isActivePractice,
    isImportant: false,
    isPassive,
    producesResult,
  };
}

export function calculateTaskXp(input: TaskXpInput) {
  return Math.max(
    0,
    taskDifficultyBaseXp[input.difficulty]
      + (input.isActivePractice ? 5 : 0)
      + (input.producesResult ? 5 : 0)
      + (input.isImportant ? 10 : 0)
      - (input.isPassive ? 5 : 0),
  );
}
