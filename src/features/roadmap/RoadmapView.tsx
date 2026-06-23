import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/common/Button';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import { AnimatedCircularProgressBar } from '../../components/magic/AnimatedCircularProgressBar';
import { useLanguage, type AppLanguage, type TextDictionary } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import type {
  RoadmapStage,
  RoadmapStageStatus,
  RoadmapTask,
  RoadmapTaskStatus,
} from '../../types/roadmap';
import { fetchGoalQuestions } from '../goals/questionsApi';
import { getActiveMentorCharacterId, getMentorCharacter } from '../mentor/mentorCharacters';
import { generateRoadmap } from './generateRoadmap';
import { createRoadmap, fetchRoadmap, setRoadmapTaskCompletion } from './roadmapApi';

type RoadmapViewProps = {
  goal: GoalSummary;
  onBackToGoal?: () => void;
  onGoalProgressChange?: (progress: number, status: GoalStatus) => void;
};

const pendingRoadmapRequests = new Map<string, Promise<RoadmapStage[]>>();
const roadmapLoadTimeoutMs = 10000;

type DisplayRoadmapTask = RoadmapTask & {
  isFallback?: boolean;
};

type DisplayRoadmapStage = Omit<RoadmapStage, 'tasks'> & {
  isFallback?: boolean;
  tasks: DisplayRoadmapTask[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function formatDate(value: string | null, language: AppLanguage) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(language === 'ru' ? 'ru' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function getAnsweredQuestions(questions: GoalQuestion[]) {
  return questions.filter((question) => question.answer.trim());
}

function getGoalProgress(stages: DisplayRoadmapStage[]) {
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

function getStageProgress(stage: DisplayRoadmapStage) {
  if (stage.tasks.length === 0) {
    return 0;
  }

  const completedTasks = stage.tasks.filter((task) => task.status === 'completed');

  return Math.round((completedTasks.length / stage.tasks.length) * 100);
}

function getStageStatus(stage: RoadmapStage, firstOpenStageId: string | null): RoadmapStageStatus {
  if (stage.tasks.length > 0 && stage.tasks.every((task) => task.status === 'completed')) {
    return 'completed';
  }

  return stage.id === firstOpenStageId ? 'active' : 'locked';
}

function getStageClassName(stage: DisplayRoadmapStage) {
  return ['stage-panel', 'stage-panel-revealed', `stage-panel-${stage.status}`, stage.isFallback ? 'stage-panel-fallback' : '']
    .filter(Boolean)
    .join(' ');
}

function getVisibleStages(stages: DisplayRoadmapStage[]) {
  const activeStage = stages.find((stage) => stage.status === 'active');

  if (!activeStage) {
    return stages;
  }

  return stages.filter((stage) => stage.status === 'completed' || stage.id === activeStage.id);
}

function getStageStatusLabel(status: RoadmapStageStatus, t: TextDictionary) {
  const labels: Record<RoadmapStageStatus, string> = {
    active: t.active,
    completed: t.completed,
    locked: t.locked,
  };

  return labels[status];
}

function getShortText(value: string, maxLength = 132) {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trimEnd()}...`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
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

async function generateAndSaveRoadmap(
  goal: GoalSummary,
  questions: GoalQuestion[],
  language: AppLanguage,
) {
  const pendingRequestKey = `${goal.id}:${language}`;
  const pendingRequest = pendingRoadmapRequests.get(pendingRequestKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = generateRoadmap(goal, questions, language)
    .then((roadmap) => createRoadmap(goal, roadmap))
    .finally(() => {
      pendingRoadmapRequests.delete(pendingRequestKey);
    });

  pendingRoadmapRequests.set(pendingRequestKey, nextRequest);

  return nextRequest;
}

function createFallbackTask({
  description,
  goal,
  id,
  isFallback = true,
  sortOrder,
  stageId,
  status,
  title,
}: {
  description: string;
  goal: GoalSummary;
  id?: string;
  isFallback?: boolean;
  sortOrder: number;
  stageId: string;
  status: RoadmapTaskStatus;
  title: string;
}): DisplayRoadmapTask {
  const timestamp = goal.updatedAt || goal.createdAt;

  return {
    completedAt: status === 'completed' ? timestamp : null,
    createdAt: timestamp,
    description,
    dueDate: null,
    estimatedMinutes: Math.max(goal.availableTime, 15),
    goalId: goal.id,
    id: id ?? `${stageId}-task-${sortOrder}`,
    isFallback,
    sortOrder,
    stageId,
    status,
    title,
    updatedAt: timestamp,
  };
}

function buildFallbackRoadmap(goal: GoalSummary, t: TextDictionary) {
  const timestamp = goal.updatedAt || goal.createdAt;
  const hasProgress = goal.progress > 0;
  const firstAction = goal.aiAnalysis?.firstSmallAction || goal.description || goal.title;
  const currentAction = goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? t.createRoadmap;
  const hasRealPreviewTask = Boolean(goal.todayTask?.id);
  const firstStageId = `${goal.id}-fallback-start`;
  const currentStageId = `${goal.id}-fallback-current`;
  const futureStageId = `${goal.id}-fallback-future`;
  const firstStageStatus: RoadmapStageStatus = hasProgress ? 'completed' : 'active';
  const currentStageStatus: RoadmapStageStatus = hasProgress ? 'active' : 'locked';

  return [
    {
      createdAt: timestamp,
      description: hasProgress ? t.startedMovingText : t.smallestActionToday,
      goalId: goal.id,
      id: firstStageId,
      isFallback: true,
      sortOrder: 0,
      status: firstStageStatus,
      successCriteria: hasProgress ? [t.completed] : [t.unlocked],
      tasks: [
        createFallbackTask({
          description: goal.aiAnalysis?.goalSummary || goal.description || t.savedGoalDescription,
          goal,
          id: !hasProgress ? goal.todayTask?.id : undefined,
          isFallback: hasProgress || !hasRealPreviewTask,
          sortOrder: 0,
          stageId: firstStageId,
          status: hasProgress ? 'completed' : 'todo',
          title: hasProgress ? t.startedMoving : goal.todayTask?.title ?? firstAction,
        }),
      ],
      title: hasProgress ? t.startedMoving : t.firstDirection,
    },
    {
      createdAt: timestamp,
      description: hasProgress ? t.smallestActionToday : t.roadmapAfterQuestions,
      goalId: goal.id,
      id: currentStageId,
      isFallback: true,
      sortOrder: 1,
      status: currentStageStatus,
      successCriteria: [hasProgress ? t.today : t.locked],
      tasks: [
        createFallbackTask({
          description: goal.aiAnalysis?.goalSummary || t.unlockingTasksDescription,
          goal,
          id: hasProgress ? goal.todayTask?.id : undefined,
          isFallback: !hasProgress || !hasRealPreviewTask,
          sortOrder: 0,
          stageId: currentStageId,
          status: 'todo',
          title: currentAction,
        }),
      ],
      title: hasProgress ? t.todaysNextStep : t.createRoadmap,
    },
    {
      createdAt: timestamp,
      description: goal.aiAnalysis?.steps[1] ?? t.createRoadmapToGetTask,
      goalId: goal.id,
      id: futureStageId,
      isFallback: true,
      sortOrder: 2,
      status: 'locked',
      successCriteria: [t.locked],
      tasks: [
        createFallbackTask({
          description: t.roadmapReadyDescription,
          goal,
          sortOrder: 0,
          stageId: futureStageId,
          status: 'todo',
          title: t.thisWeek,
        }),
      ],
      title: t.thisWeek,
    },
  ] satisfies DisplayRoadmapStage[];
}

export function RoadmapView({ goal, onBackToGoal, onGoalProgressChange }: RoadmapViewProps) {
  const { language, t } = useLanguage();
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
  const hasPersistedRoadmap = stages.some((stage) => stage.tasks.length > 0);
  const displayStages: DisplayRoadmapStage[] = useMemo(
    () => (hasPersistedRoadmap ? updateStageStatuses(stages) : buildFallbackRoadmap(goal, t)),
    [goal, hasPersistedRoadmap, stages, t],
  );
  const visibleStages = useMemo(() => getVisibleStages(displayStages), [displayStages]);
  const totalTasks = displayStages.reduce((count, stage) => count + stage.tasks.length, 0);
  const completedTasks = displayStages.reduce(
    (count, stage) => count + stage.tasks.filter((task) => task.status === 'completed').length,
    0,
  );
  const overallProgress = hasPersistedRoadmap ? getGoalProgress(displayStages) : goal.progress;
  const currentStage = displayStages.find((stage) => stage.status === 'active') ?? displayStages[0];
  const remainingTasks = Math.max(totalTasks - completedTasks, 0);
  const companion = getMentorCharacter(getActiveMentorCharacterId());
  const companionFallback = companion.shortName.slice(0, 2);

  useEffect(() => {
    let isActive = true;

    withTimeout(
      Promise.allSettled([fetchGoalQuestions(goal.id), fetchRoadmap(goal.id)]),
      roadmapLoadTimeoutMs,
      'Roadmap data took too long to load. Showing a safe preview path.',
    )
      .then(([questionsResult, stagesResult]) => {
        if (!isActive) {
          return;
        }

        if (questionsResult.status === 'fulfilled') {
          setQuestions(questionsResult.value);
        } else {
          setQuestions([]);
          setError(getErrorMessage(questionsResult.reason));
        }

        if (stagesResult.status === 'fulfilled') {
          setStages(stagesResult.value);
        } else {
          setStages([]);
          setError(getErrorMessage(stagesResult.reason));
        }
      })
      .catch((caughtError: unknown) => {
        if (!isActive) {
          return;
        }

        setQuestions([]);
        setStages([]);
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
        throw new Error(t.answerQuickQuestionsFirst);
      }

      if (nextAnsweredQuestions.length !== nextQuestions.length) {
        throw new Error(t.answerAllQuickQuestions);
      }

      const existingRoadmap = await fetchRoadmap(goal.id);

      if (existingRoadmap.length > 0) {
        setStages(existingRoadmap);
        return;
      }

      const nextStages = await generateAndSaveRoadmap(goal, nextQuestions, language);
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

    setError(null);
    if (stages.length > 0) {
      const optimisticStages = getOptimisticStages(stages, task.id, isCompleted);
      const optimisticProgress = getGoalProgress(optimisticStages);
      const optimisticStatus = getGoalStatus(optimisticProgress);

      setStages(optimisticStages);
      onGoalProgressChange?.(optimisticProgress, optimisticStatus);
    }

    desiredTaskCompletionRef.current.set(task.id, isCompleted);
    void persistLatestTaskCompletion(task.id);
  };

  return (
    <div className="page-stack roadmap-page">
      <header className="roadmap-topbar">
        <div>
          <span className="eyebrow">{goal.title}</span>
          <h1>{t.roadmap}</h1>
          <p>{goal.description || t.roadmapActionDescription}</p>
        </div>
        {onBackToGoal ? (
          <Button variant="secondary" onClick={onBackToGoal}>
            {t.openGoal}
          </Button>
        ) : null}
      </header>

      {isLoading ? (
        <section className="roadmap-panel roadmap-stitch-view">
          <div className="inline-state">
            <strong>{t.checkingRoadmap}</strong>
            <p>{t.loadingSavedStages}</p>
          </div>
        </section>
      ) : null}

      {!isLoading ? (
        <section className="roadmap-page-layout" aria-label={t.roadmap}>
          <main className="roadmap-main">
            <section className="roadmap-panel roadmap-summary-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">{t.overallProgress}</span>
                  <h2>{hasPersistedRoadmap ? t.planReady : t.noRoadmapYet}</h2>
                  <p>
                    {hasPersistedRoadmap
                      ? `${completedTasks} of ${totalTasks} tasks completed. ${remainingTasks} to go.`
                      : t.roadmapActionDescription}
                  </p>
                </div>
                <AnimatedCircularProgressBar
                  className="progress-ring"
                  gaugePrimaryColor="var(--accent)"
                  gaugeSecondaryColor="rgba(var(--app-brand-rgb), 0.16)"
                  value={overallProgress}
                />
              </div>
              {error ? (
                <div className="form-error questions-error" role="alert">
                  <span>{error}</span>
                </div>
              ) : null}
              {!hasPersistedRoadmap ? (
                <div className="roadmap-fallback-note">
                  <strong>{t.plan}</strong>
                  <p>{t.createRoadmapToGetTask}</p>
                </div>
              ) : null}
            </section>

            <section className="roadmap-grid roadmap-journey-map" aria-label={t.roadmap}>
              {visibleStages.map((stage, index) => {
                const stageProgress = getStageProgress(stage);
                const stageCompletedTasks = stage.tasks.filter((task) => task.status === 'completed').length;

                return (
                  <article className={getStageClassName(stage)} key={stage.id}>
                    <div className="stage-node" aria-hidden="true">
                      <span>{index + 1}</span>
                    </div>
                    <div className="stage-card-toolbar">
                      <span className="stage-status-pill">{getStageStatusLabel(stage.status, t)}</span>
                      <span className="stage-task-pill">{`${stageCompletedTasks}/${stage.tasks.length} ${t.loadingTasks}`}</span>
                    </div>
                    <div className="stage-heading">
                      <span>{`Stage ${index + 1}`}</span>
                      <strong>{stage.title}</strong>
                      <p>{getShortText(stage.description)}</p>
                    </div>

                    <div className="stage-progress-row">
                      <span>{`${stageCompletedTasks}/${stage.tasks.length} ${t.loadingTasks}`}</span>
                      <strong>{stageProgress}%</strong>
                    </div>
                    <div className="progress-bar" aria-hidden="true">
                      <span style={{ width: `${stageProgress}%` }} />
                    </div>

                    <details className="stage-details">
                      <summary>View details</summary>

                      {stage.successCriteria.length > 0 ? (
                        <ul className="criteria-list" aria-label={t.successCriteria}>
                          {stage.successCriteria.map((criterion) => (
                            <li key={criterion}>{getShortText(criterion, 72)}</li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="task-list">
                        {stage.tasks.map((task) => {
                          const taskClassName = [
                            'task-check',
                            task.status === 'completed' ? 'task-done' : '',
                            task.isFallback ? 'task-check-preview' : '',
                          ]
                            .filter(Boolean)
                            .join(' ');

                          return (
                            <div className="task-row" key={task.id}>
                              <button
                                aria-label={
                                  task.status === 'completed'
                                    ? `Mark "${task.title}" as not done`
                                    : `Mark "${task.title}" as done`
                                }
                                className={taskClassName}
                                disabled={task.isFallback}
                                onClick={() => void handleToggleTaskCompletion(task)}
                                type="button"
                              />
                              <div>
                                <strong>{task.title}</strong>
                                <p>{getShortText(task.description, 116)}</p>
                                <small>
                                  {task.estimatedMinutes} {t.min} | {formatDate(task.dueDate, language)}
                                </small>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </article>
                );
              })}
            </section>

            {!hasPersistedRoadmap ? (
              <section className="roadmap-panel roadmap-generate-card">
                <div>
                  <span className="eyebrow">{t.doThisNext}</span>
                  <h2>{t.createRoadmap}</h2>
                  <p>
                    {stages.length > 0
                      ? t.roadmapActionDescription
                      : canGenerateRoadmap
                        ? t.roadmapReadyDescription
                        : t.saveAnswersFirst}
                  </p>
                </div>

                {stages.length > 0 ? (
                  <div className="inline-state">
                    <strong>{t.noRoadmapYet}</strong>
                    <p>{t.roadmapActionDescription}</p>
                  </div>
                ) : !canGenerateRoadmap ? (
                  <div className="inline-state">
                    <strong>{t.answerQuickQuestionsFirst}</strong>
                    <p>{t.saveAnswersFirst}</p>
                  </div>
                ) : (
                  <div className="inline-state inline-state-ready">
                    <strong>{t.readyToCreate}</strong>
                    <p>{t.roadmapReadyDescription}</p>
                  </div>
                )}

                <div className="question-actions">
                  <Button disabled={isGenerating || !canGenerateRoadmap} onClick={() => void handleGenerate()}>
                    {isGenerating ? (
                      <ProgressiveFluxLoader
                        className="progressive-flux-loader-compact"
                        phases={[
                          { at: 0, label: t.loadingStages },
                          { at: 45, label: t.loadingTasks },
                          { at: 80, label: t.loadingReady },
                        ]}
                      />
                    ) : (
                      t.createRoadmap
                    )}
                  </Button>
                </div>
              </section>
            ) : null}
          </main>

          <aside className="roadmap-side">
            <section className="roadmap-mentor-card">
              <div className="stitch-mentor-avatar" aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <strong>{companion.name}</strong>
              <span>{t.aiMentor}</span>
              <p>{currentStage ? getShortText(currentStage.description, 118) : t.roadmapActionDescription}</p>
            </section>

            <section className="roadmap-insight-card">
              <span>{t.thisWeek}</span>
              <strong>{currentStage?.title ?? t.createRoadmap}</strong>
              <p>
                {hasPersistedRoadmap
                  ? remainingTasks > 0
                    ? `${remainingTasks} tasks left on this path.`
                    : t.completed
                  : t.roadmapAfterQuestions}
              </p>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
