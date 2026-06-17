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

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Твои цели</h1>
          <p>Здесь будет список целей, текущие задачи и общий прогресс.</p>
        </div>
        <Button onClick={onCreateClick}>Создать цель</Button>
      </header>

      <section className="stats-grid" aria-label="Статистика целей">
        <div className="stat-tile">
          <span>Всего целей</span>
          <strong>{goals.length}</strong>
        </div>
        <div className="stat-tile">
          <span>Активные</span>
          <strong>{activeGoals}</strong>
        </div>
        <div className="stat-tile">
          <span>Средний прогресс</span>
          <strong>{averageProgress}%</strong>
        </div>
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
        <section className="state-panel">
          <h2>Пока нет целей</h2>
          <p>Создай первую цель, чтобы увидеть здесь дорожную карту и сегодняшнее задание.</p>
          <Button onClick={onCreateClick}>Создать цель</Button>
        </section>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
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
      ) : null}
    </div>
  );
}
