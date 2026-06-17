import type { ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import type { GoalSummary } from '../../types/goal';

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
  goal: GoalSummary & {
    stages?: GoalStage[];
  };
  onBack: () => void;
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

export function GoalDetailMock({ goal, onBack, questionsPanel, roadmapPanel }: GoalDetailMockProps) {
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

  return (
    <div className="page-stack">
      <header className="detail-header">
        <Button variant="ghost" onClick={onBack}>
          Назад
        </Button>
        <div>
          <span className="eyebrow">Страница цели</span>
          <h1>{goal.title}</h1>
          <p>{goal.description || 'Описание можно будет уточнить перед генерацией плана.'}</p>
        </div>
      </header>

      <section className="detail-summary" aria-label="Сводка цели">
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

      <section className="task-focus">
        <div>
          <span className="eyebrow">Сегодняшнее задание</span>
          <h2>{todayTitle}</h2>
          <p>{todayDescription}</p>
        </div>
        <Button disabled={!currentTask || currentTask.status === 'completed'}>
          Отметить выполненным
        </Button>
      </section>

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
