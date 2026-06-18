import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import type { GoalSummary } from '../../types/goal';
import type { DetailSectionId } from '../../types/navigation';

type TaskStatus = 'todo' | 'completed';

type GoalTask = {
  description: string;
  estimatedMinutes: number;
  id: string;
  status: TaskStatus;
  title: string;
};

type GoalStage = {
  description: string;
  id: string;
  status: 'active' | 'locked' | 'completed';
  tasks: GoalTask[];
  title: string;
};

type GoalDetailMockProps = {
  activeSection?: DetailSectionId | null;
  canDeleteGoal?: boolean;
  deletingGoalId?: string | null;
  goal: GoalSummary & {
    stages?: GoalStage[];
  };
  onBack: () => void;
  onDeleteGoal?: (goalId: string) => void;
  questionsPanel?: ReactNode;
  roadmapPanel?: ReactNode;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function GoalDetailMock({
  activeSection = null,
  canDeleteGoal = false,
  deletingGoalId = null,
  goal,
  onBack,
  onDeleteGoal,
  questionsPanel,
  roadmapPanel,
}: GoalDetailMockProps) {
  const mentorRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLElement | null>(null);
  const roadmapRef = useRef<HTMLDivElement | null>(null);
  const tasksRef = useRef<HTMLElement | null>(null);
  const stages = goal.stages ?? [];
  const allTasks = stages.flatMap((stage) => stage.tasks);
  const currentTask = allTasks.find((task) => task.status !== 'completed') ?? allTasks[0];
  const completedTasks = allTasks.filter((task) => task.status === 'completed');
  const aiAnalysis = goal.aiAnalysis;
  const todayTitle = currentTask?.title ?? aiAnalysis?.firstSmallAction ?? 'Следующий шаг: дорожная карта';
  const todayDescription =
    currentTask?.description ??
    (aiAnalysis
      ? 'Это первый маленький шаг от AI-наставника. Его можно сделать уже сегодня.'
      : 'Сейчас можно сгенерировать план ниже. Отмечать задачи выполненными будем на следующем этапе.');

  useEffect(() => {
    const sectionRefs: Partial<Record<DetailSectionId, HTMLElement | HTMLDivElement | null>> = {
      mentor: mentorRef.current,
      progress: progressRef.current,
      roadmap: roadmapRef.current,
      tasks: tasksRef.current,
    };
    const element = activeSection ? sectionRefs[activeSection] : null;

    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSection, goal.id]);

  return (
    <div className="page-stack">
      <header className="detail-header">
        <div className="detail-actions">
          <Button variant="ghost" onClick={onBack}>
            Назад
          </Button>
          {canDeleteGoal ? (
            <Button
              disabled={deletingGoalId === goal.id}
              onClick={() => onDeleteGoal?.(goal.id)}
              variant="danger"
            >
              {deletingGoalId === goal.id ? 'Удаляем...' : 'Удалить'}
            </Button>
          ) : null}
        </div>
        <div>
          <span className="eyebrow">Страница цели</span>
          <h1>{goal.title}</h1>
          <p>{goal.description || 'Описание можно будет уточнить перед генерацией плана.'}</p>
        </div>
      </header>

      <section className="detail-summary" ref={progressRef} aria-label="Сводка цели">
        <div>
          <span>Срок</span>
          <strong>{formatDate(goal.targetDate)}</strong>
        </div>
        <div>
          <span>Время</span>
          <strong>
            {goal.availableTime} мин. {goal.timePeriod === 'day' ? 'в день' : 'в неделю'}
          </strong>
        </div>
        <div>
          <span>Прогресс</span>
          <strong>{goal.progress}%</strong>
        </div>
        <div>
          <span>Уровень</span>
          <strong>{goal.currentLevel || 'Не указан'}</strong>
        </div>
      </section>

      <div className="detail-section-anchor" ref={mentorRef}>
        {aiAnalysis ? (
          <section className="ai-analysis-panel" aria-label="AI-анализ цели">
            <div>
              <span className="eyebrow">AI-наставник</span>
              <h2>Стартовый план</h2>
              <p>{aiAnalysis.goalSummary}</p>
            </div>

            <div className="ai-analysis-grid">
              <div>
                <span>Уровень</span>
                <strong>{aiAnalysis.estimatedUserLevel}</strong>
              </div>
              <div>
                <span>Сегодня</span>
                <strong>{aiAnalysis.firstSmallAction}</strong>
              </div>
            </div>

            <div className="ai-analysis-columns">
              <div>
                <h3>Шаги</h3>
                <ol>
                  {aiAnalysis.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3>Вопросы</h3>
                <ul>
                  {aiAnalysis.clarificationQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {questionsPanel}
      </div>

      <section className="task-focus" ref={tasksRef}>
        <div>
          <span className="eyebrow">Сегодняшнее задание</span>
          <h2>{todayTitle}</h2>
          <p>{todayDescription}</p>
        </div>
        <Button disabled={!currentTask || currentTask.status === 'completed'}>
          Отметить выполненным
        </Button>
      </section>

      <div className="detail-section-anchor" ref={roadmapRef}>
        {roadmapPanel ??
          (stages.length > 0 ? (
            <section className="roadmap-grid" aria-label="Дорожная карта">
            {stages.map((stage, index) => (
              <article className="stage-panel" key={stage.id}>
                <div className="stage-heading">
                  <span>Этап {index + 1}</span>
                  <strong>{stage.title}</strong>
                  <p>{stage.description}</p>
                </div>
                <div className="task-list">
                  {stage.tasks.map((task) => (
                    <div className="task-row" key={task.id}>
                      <span className={task.status === 'completed' ? 'task-check task-done' : 'task-check'} />
                      <div>
                        <strong>{task.title}</strong>
                        <small>{task.estimatedMinutes} минут</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            </section>
          ) : (
            <section className="state-panel">
              <h2>Дорожная карта пока пустая</h2>
              <p>На этом этапе цель уже хранится в Supabase. Этапы и задачи будут добавлены позже.</p>
            </section>
          ))}
      </div>

      <section className="history-panel">
        <div>
          <h2>История</h2>
          <p>
            Выполнено задач: <strong>{completedTasks.length}</strong> из <strong>{allTasks.length}</strong>
          </p>
        </div>
        <div className="locked-actions">
          <Button disabled variant="secondary">
            Мне нужна помощь
          </Button>
          <Button disabled variant="secondary">
            Изменить план
          </Button>
        </div>
      </section>
    </div>
  );
}
