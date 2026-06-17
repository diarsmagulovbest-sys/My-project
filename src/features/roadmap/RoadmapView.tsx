import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { fetchGoalQuestions } from '../goals/questionsApi';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import type { RoadmapStage } from '../../types/roadmap';
import { generateRoadmap } from './generateRoadmap';
import { createRoadmap, fetchRoadmap } from './roadmapApi';

type RoadmapViewProps = {
  goal: Goal;
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

export function RoadmapView({ goal }: RoadmapViewProps) {
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [stages, setStages] = useState<RoadmapStage[]>([]);

  const answeredQuestions = useMemo(() => getAnsweredQuestions(questions), [questions]);
  const canGenerateRoadmap =
    questions.length > 0 && answeredQuestions.length === questions.length && stages.length === 0;
  const totalTasks = stages.reduce((count, stage) => count + stage.tasks.length, 0);

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
                {stages.length} этапов и {totalTasks} задач сохранены в Supabase.
              </p>
            </div>
          </div>
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
                    <span className={task.status === 'completed' ? 'task-check task-done' : 'task-check'} />
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
          <p>Gemini составит этапы и задачи по цели, сроку, времени и твоим ответам.</p>
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
          <p>Ответь на все уточняющие вопросы выше и нажми «Сохранить ответы» или «Продолжить».</p>
        </div>
      ) : null}

      <div className="question-actions">
        <Button disabled={isGenerating || !canGenerateRoadmap} onClick={() => void handleGenerate()}>
          {isGenerating ? 'Генерируем...' : 'Сгенерировать дорожную карту'}
        </Button>
      </div>
    </section>
  );
}
