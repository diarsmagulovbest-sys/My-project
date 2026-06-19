import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/common/Button';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import { fetchGoalQuestions } from '../goals/questionsApi';
import type { Goal, GoalStatus } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import type {
  RoadmapStage,
  RoadmapStageStatus,
  RoadmapTask,
  RoadmapTaskStatus,
} from '../../types/roadmap';
import { generateRoadmap } from './generateRoadmap';
import { createRoadmap, fetchRoadmap, setRoadmapTaskCompletion } from './roadmapApi';

type RoadmapViewProps = {
  goal: Goal;
  onGoalProgressChange?: (progress: number, status: GoalStatus) => void;
};

const pendingRoadmapRequests = new Map<string, Promise<RoadmapStage[]>>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Без даты';
  }

  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function getAnsweredQuestions(questions: GoalQuestion[]) {
  return questions.filter((question) => question.answer.trim());
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

function updateStageStatuses(stages: RoadmapStage[]) {
  const firstOpenStage = stages.find((stage) =>
    stage.tasks.some((task) => task.status !== 'completed'),
  );

  return stages.map((stage) => ({
    ...stage,
    status: getStageStatus(stage, firstOpenStage?.id ?? null),
  }));
}

function getOptimisticStages(stages: RoadmapStage[], taskId: string, isCompleted: boolean) {
  const now = new Date().toISOString();
  const nextTaskStatus: RoadmapTaskStatus = isCompleted ? 'completed' : 'todo';
  const nextStages = stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completedAt: isCompleted ? now : null,
            status: nextTaskStatus,
            updatedAt: now,
          }
        : task,
    ),
  }));

  return updateStageStatuses(nextStages);
}

async function generateAndSaveRoadmap(goal: Goal, questions: GoalQuestion[]) {
  const pendingRequest = pendingRoadmapRequests.get(goal.id);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = generateRoadmap(goal, questions)
    .then((roadmap) => createRoadmap(goal, roadmap))
    .finally(() => {
      pendingRoadmapRequests.delete(goal.id);
    });

  pendingRoadmapRequests.set(goal.id, nextRequest);

  return nextRequest;
}

export function RoadmapView({ goal, onGoalProgressChange }: RoadmapViewProps) {
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [stages, setStages] = useState<RoadmapStage[]>([]);
  const desiredTaskCompletionRef = useRef(new Map<string, boolean>());
  const savingTaskIdsRef = useRef(new Set<string>());

  const answeredQuestions = useMemo(() => getAnsweredQuestions(questions), [questions]);
  const canGenerateRoadmap =
    questions.length > 0 && answeredQuestions.length === questions.length && stages.length === 0;
  const totalTasks = stages.reduce((count, stage) => count + stage.tasks.length, 0);
  const completedTasks = stages.reduce(
    (count, stage) => count + stage.tasks.filter((task) => task.status === 'completed').length,
    0,
  );

  useEffect(() => {
    let isActive = true;

    Promise.all([fetchGoalQuestions(goal.id), fetchRoadmap(goal.id)])
      .then(([nextQuestions, nextStages]) => {
        if (!isActive) {
          return;
        }

        setQuestions(nextQuestions);
        setStages(nextStages);
      })
      .catch((caughtError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [goal.id]);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const nextQuestions = await fetchGoalQuestions(goal.id);
      const nextAnsweredQuestions = getAnsweredQuestions(nextQuestions);

      setQuestions(nextQuestions);

      if (nextQuestions.length === 0) {
        throw new Error('Сначала нужно получить уточняющие вопросы.');
      }

      if (nextAnsweredQuestions.length !== nextQuestions.length) {
        throw new Error('Ответь на все уточняющие вопросы и сохрани ответы.');
      }

      const existingRoadmap = await fetchRoadmap(goal.id);

      if (existingRoadmap.length > 0) {
        setStages(existingRoadmap);
        return;
      }

      const nextStages = await generateAndSaveRoadmap(goal, nextQuestions);
      setStages(nextStages);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsGenerating(false);
    }
  };

  const persistLatestTaskCompletion = async (taskId: string) => {
    if (savingTaskIdsRef.current.has(taskId)) {
      return;
    }

    savingTaskIdsRef.current.add(taskId);

    try {
      while (desiredTaskCompletionRef.current.has(taskId)) {
        const desiredCompletion = desiredTaskCompletionRef.current.get(taskId);

        if (desiredCompletion === undefined) {
          break;
        }

        const result = await setRoadmapTaskCompletion(goal.id, taskId, desiredCompletion);
        const latestDesiredCompletion = desiredTaskCompletionRef.current.get(taskId);

        if (latestDesiredCompletion === desiredCompletion) {
          desiredTaskCompletionRef.current.delete(taskId);
          setStages(result.stages);
          onGoalProgressChange?.(result.goalProgress, result.goalStatus);
        }
      }
    } catch (caughtError) {
      desiredTaskCompletionRef.current.delete(taskId);
      setError(getErrorMessage(caughtError));
    } finally {
      savingTaskIdsRef.current.delete(taskId);
    }
  };

  const handleToggleTaskCompletion = (task: RoadmapTask) => {
    const isCompleted = task.status !== 'completed';
    const optimisticStages = getOptimisticStages(stages, task.id, isCompleted);
    const optimisticProgress = getGoalProgress(optimisticStages);
    const optimisticStatus = getGoalStatus(optimisticProgress);

    setError(null);
    setStages(optimisticStages);
    onGoalProgressChange?.(optimisticProgress, optimisticStatus);
    desiredTaskCompletionRef.current.set(task.id, isCompleted);
    void persistLatestTaskCompletion(task.id);
  };

  if (isLoading) {
    return (
      <section className="roadmap-panel">
        <div className="inline-state">
          <strong>Проверяем дорожную карту...</strong>
          <p>Загружаем сохранённые этапы и ответы на вопросы.</p>
        </div>
      </section>
    );
  }

  if (stages.length > 0) {
    return (
      <>
        <section className="roadmap-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Дорожная карта</span>
              <h2>План готов</h2>
              <p>
                Выполнено {completedTasks} из {totalTasks} задач.
              </p>
            </div>
          </div>
          {error ? (
            <div className="form-error questions-error" role="alert">
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        <section className="roadmap-grid" aria-label="Дорожная карта">
          {stages.map((stage, index) => (
            <article className="stage-panel" key={stage.id}>
              <div className="stage-heading">
                <span>Этап {index + 1}</span>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>
              </div>

              {stage.successCriteria.length > 0 ? (
                <ul className="criteria-list" aria-label="Критерии успеха">
                  {stage.successCriteria.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              ) : null}

              <div className="task-list">
                {stage.tasks.map((task) => (
                  <div className="task-row" key={task.id}>
                    <button
                      aria-label={
                        task.status === 'completed'
                          ? `Снять отметку выполнения с задачи «${task.title}»`
                          : `Отметить задачу «${task.title}» выполненной`
                      }
                      className={task.status === 'completed' ? 'task-check task-done' : 'task-check'}
                      onClick={() => void handleToggleTaskCompletion(task)}
                      type="button"
                    />
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                      <small>
                        {task.estimatedMinutes} минут · {formatDate(task.dueDate)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </>
    );
  }

  return (
    <section className="roadmap-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Дорожная карта</span>
          <h2>Сгенерировать план</h2>
          <p>AI-наставник составит этапы и задачи по цели, сроку, времени и твоим ответам.</p>
        </div>
      </div>

      {error ? (
        <div className="form-error questions-error" role="alert">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void handleGenerate()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!canGenerateRoadmap ? (
        <div className="inline-state">
          <strong>Нужны сохранённые ответы</strong>
          <p>Ответь на все уточняющие вопросы выше и нажми «Сохранить и открыть план».</p>
        </div>
      ) : (
        <div className="inline-state">
          <strong>Можно создавать дорожную карту</strong>
          <p>Нажми кнопку ниже, и AI-наставник соберёт этапы и первые задачи.</p>
        </div>
      )}

      <div className="question-actions">
        <Button disabled={isGenerating || !canGenerateRoadmap} onClick={() => void handleGenerate()}>
          {isGenerating ? (
            <ProgressiveFluxLoader
              className="progressive-flux-loader-compact"
              phases={[
                { at: 0, label: 'этапы' },
                { at: 45, label: 'задачи' },
                { at: 80, label: 'готово' },
              ]}
            />
          ) : (
            'Сгенерировать дорожную карту'
          )}
        </Button>
      </div>
    </section>
  );
}
