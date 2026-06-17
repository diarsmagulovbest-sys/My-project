import { Button } from '../../components/common/Button';
import type { GoalStatus, GoalSummary } from '../../types/goal';

type GoalsDashboardProps = {
  error?: string | null;
  goals: GoalSummary[];
  isLoading?: boolean;
  onCreateClick: () => void;
  onOpenGoal: (goalId: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function getStatusLabel(status: GoalStatus) {
  const labels: Record<GoalStatus, string> = {
    active: 'Активна',
    archived: 'Архив',
    completed: 'Завершена',
    draft: 'Черновик',
    paused: 'Пауза',
  };

  return labels[status];
}

function getNextAction(goal: GoalSummary | undefined) {
  if (!goal) {
    return 'Создай первую цель, и AI-наставник предложит маленький шаг на сегодня.';
  }

  return goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? 'Открой цель и создай дорожную карту.';
}

export function GoalsDashboard({
  error = null,
  goals,
  isLoading = false,
  onCreateClick,
  onOpenGoal,
}: GoalsDashboardProps) {
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const averageProgress =
    goals.length > 0
      ? Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length)
      : 0;
  const focusGoal = goals.find((goal) => goal.status === 'active') ?? goals[0];
  const nextAction = getNextAction(focusGoal);

  return (
    <div className="page-stack">
      <section className="mentor-home" aria-label="AI-наставник">
        <div className="mentor-card">
          <div className="mentor-orb" aria-hidden="true">
            AI
          </div>
          <div className="mentor-copy">
            <span className="eyebrow">AI-наставник</span>
            <h1>Что делаем сегодня?</h1>
            <p>{nextAction}</p>
            <div className="mentor-actions">
              {focusGoal ? (
                <Button onClick={() => onOpenGoal(focusGoal.id)}>Открыть цель</Button>
              ) : (
                <Button onClick={onCreateClick}>Создать цель</Button>
              )}
              <Button variant="secondary" onClick={onCreateClick}>
                Новая цель
              </Button>
            </div>
          </div>
        </div>

        <aside className="mentor-side-panel" aria-label="Быстрый прогресс">
          <div>
            <span>Фокус</span>
            <strong>{focusGoal?.title ?? 'Нет цели'}</strong>
          </div>
          <div className="mentor-progress">
            <span>Общий прогресс</span>
            <strong>{averageProgress}%</strong>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${averageProgress}%` }} />
            </div>
          </div>
          <div className="mentor-stats-row">
            <span>{goals.length} целей</span>
            <span>{activeGoals} активных</span>
          </div>
        </aside>
      </section>

      {isLoading ? (
        <section className="state-panel" aria-live="polite">
          <h2>Загрузка целей...</h2>
          <p>Подготавливаем список.</p>
        </section>
      ) : null}

      {error ? (
        <section className="state-panel state-panel-error" role="alert">
          <h2>Не получилось загрузить цели</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && goals.length === 0 ? (
        <section className="state-panel empty-goals-panel">
          <h2>Пока нет целей</h2>
          <p>Опиши, чему хочешь научиться. AI-наставник сразу подготовит первый понятный шаг.</p>
          <Button onClick={onCreateClick}>Создать цель</Button>
        </section>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Мои цели</span>
              <h2>Продолжай в своём темпе</h2>
            </div>
            <Button variant="secondary" onClick={onCreateClick}>
              Создать цель
            </Button>
          </div>

          <section className="goal-grid" aria-label="Список целей">
            {goals.map((goal) => (
              <article className="goal-card" key={goal.id}>
                <div className="goal-card-top">
                  <span className={`status-pill status-${goal.status}`}>{getStatusLabel(goal.status)}</span>
                  <span className="date-label">до {formatDate(goal.targetDate)}</span>
                </div>
                <h2>{goal.title}</h2>
                <p>{goal.description || 'Описание можно будет уточнить перед генерацией плана.'}</p>

                <div className="progress-row" aria-label={`Прогресс ${goal.progress}%`}>
                  <span>Прогресс</span>
                  <strong>{goal.progress}%</strong>
                </div>
                <div className="progress-bar" aria-hidden="true">
                  <span style={{ width: `${goal.progress}%` }} />
                </div>

                <div className="today-box">
                  <span>Сегодня</span>
                  <strong>
                    {goal.todayTask?.title ??
                      goal.aiAnalysis?.firstSmallAction ??
                      'Задание появится после создания плана'}
                  </strong>
                </div>

                <Button variant="secondary" onClick={() => onOpenGoal(goal.id)}>
                  Открыть
                </Button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
