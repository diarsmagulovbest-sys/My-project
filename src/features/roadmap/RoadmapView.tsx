import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/common/Button';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import { useLanguage, type AppLanguage } from '../../lib/language';
import type { Goal, GoalStatus } from '../../types/goal';
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
  goal: Goal;
  onBackToGoal?: () => void;
  onGoalProgressChange?: (progress: number, status: GoalStatus) => void;
};

const pendingRoadmapRequests = new Map<string, Promise<RoadmapStage[]>>();

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

function getStageProgress(stage: RoadmapStage) {
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

function getStageClassName(stage: RoadmapStage) {
  return ['stage-panel', `stage-panel-${stage.status}`].join(' ');
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
  goal: Goal,
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
  const totalTasks = stages.reduce((count, stage) => count + stage.tasks.length, 0);
  const completedTasks = stages.reduce(
    (count, stage) => count + stage.tasks.filter((task) => task.status === 'completed').length,
    0,
  );
  const overallProgress = getGoalProgress(stages);
  const currentStage = stages.find((stage) => stage.status === 'active') ?? stages[0];
  const remainingTasks = Math.max(totalTasks - completedTasks, 0);
  const companion = getMentorCharacter(getActiveMentorCharacterId());
  const companionFallback = companion.shortName.slice(0, 2);

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
    const optimisticStages = getOptimisticStages(stages, task.id, isCompleted);
    const optimisticProgress = getGoalProgress(optimisticStages);
    const optimisticStatus = getGoalStatus(optimisticProgress);

    setError(null);
    setStages(optimisticStages);
    onGoalProgressChange?.(optimisticProgress, optimisticStatus);
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

      {!isLoading && stages.length > 0 ? (
        <section className="roadmap-page-layout" aria-label={t.roadmap}>
          <main className="roadmap-main">
            <section className="roadmap-panel roadmap-summary-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">{t.overallProgress}</span>
                  <h2>{t.planReady}</h2>
                  <p>{`${completedTasks} of ${totalTasks} tasks completed. ${remainingTasks} to go.`}</p>
                </div>
                <div className="progress-ring" aria-label={`${t.progress} ${overallProgress}%`}>
                  <span>{overallProgress}%</span>
                </div>
              </div>
              {error ? (
                <div className="form-error questions-error" role="alert">
                  <span>{error}</span>
                </div>
              ) : null}
            </section>

            <section className="roadmap-grid" aria-label={t.roadmap}>
              {stages.map((stage, index) => {
                const stageProgress = getStageProgress(stage);
                const stageCompletedTasks = stage.tasks.filter((task) => task.status === 'completed').length;

                return (
                  <article className={getStageClassName(stage)} key={stage.id}>
                    <div className="stage-node" aria-hidden="true" />
                    <div className="stage-heading">
                      <span>{`Stage ${index + 1} / ${stage.status}`}</span>
                      <strong>{stage.title}</strong>
                      <p>{stage.description}</p>
                    </div>

                    <div className="stage-progress-row">
                      <span>{`${stageCompletedTasks}/${stage.tasks.length} ${t.loadingTasks}`}</span>
                      <strong>{stageProgress}%</strong>
                    </div>
                    <div className="progress-bar" aria-hidden="true">
                      <span style={{ width: `${stageProgress}%` }} />
                    </div>

                    {stage.successCriteria.length > 0 ? (
                      <ul className="criteria-list" aria-label={t.successCriteria}>
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
                                ? `Mark "${task.title}" as not done`
                                : `Mark "${task.title}" as done`
                            }
                            className={task.status === 'completed' ? 'task-check task-done' : 'task-check'}
                            onClick={() => void handleToggleTaskCompletion(task)}
                            type="button"
                          />
                          <div>
                            <strong>{task.title}</strong>
                            <p>{task.description}</p>
                            <small>
                              {task.estimatedMinutes} {t.min} | {formatDate(task.dueDate, language)}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          </main>

          <aside className="roadmap-side">
            <section className="roadmap-mentor-card">
              <div className="stitch-mentor-avatar" aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <strong>{companion.name}</strong>
              <span>{t.aiMentor}</span>
              <p>{currentStage ? currentStage.description : t.roadmapActionDescription}</p>
            </section>

            <section className="roadmap-insight-card">
              <span>{t.thisWeek}</span>
              <strong>{currentStage?.title ?? t.createRoadmap}</strong>
              <p>{remainingTasks > 0 ? `${remainingTasks} tasks left on this path.` : t.completed}</p>
            </section>
          </aside>
        </section>
      ) : null}

      {!isLoading && stages.length === 0 ? (
        <section className="roadmap-page-layout roadmap-empty-layout">
          <main className="roadmap-main">
            <section className="roadmap-panel roadmap-action-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">{t.doThisNext}</span>
                  <h2>{t.createRoadmap}</h2>
                  <p>{t.roadmapActionDescription}</p>
                </div>
              </div>

              {error ? (
                <div className="form-error questions-error" role="alert">
                  <span>{error}</span>
                  <Button variant="secondary" onClick={() => void handleGenerate()}>
                    {t.retry}
                  </Button>
                </div>
              ) : null}

              {!canGenerateRoadmap ? (
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
          </main>

          <aside className="roadmap-side">
            <section className="roadmap-mentor-card">
              <div className="stitch-mentor-avatar" aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <strong>{companion.name}</strong>
              <span>{t.aiMentor}</span>
              <p>{t.roadmapAfterQuestions}</p>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
