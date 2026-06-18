import { Button } from '../../components/common/Button';
import focusTimeIcon from '../../assets/ui/focus-time.svg';
import streakIcon from '../../assets/ui/streak-flame.svg';
import { useLanguage } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';

type GoalsDashboardProps = {
  canDeleteGoals: boolean;
  deletingGoalId?: string | null;
  error?: string | null;
  goals: GoalSummary[];
  isGoalLimitEnabled: boolean;
  isLoading?: boolean;
  maxGoals: number;
  onCreateClick: () => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenGoal: (goalId: string) => void;
};

type Text = ReturnType<typeof useLanguage>['t'];

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function getStatusLabel(status: GoalStatus, t: Text) {
  const labels: Record<GoalStatus, string> = {
    active: t.active,
    archived: t.archived,
    completed: t.completed,
    draft: t.draft,
    paused: t.paused,
  };

  return labels[status];
}

function getNextAction(goal: GoalSummary | undefined, t: Text) {
  if (!goal) {
    return t.whatNextEmpty;
  }

  return goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? t.whatNextGoal;
}

function getWeeklyFocusMinutes(goals: GoalSummary[]) {
  return goals.reduce((totalMinutes, goal) => {
    const weeklyMinutes = goal.timePeriod === 'day' ? goal.availableTime * 7 : goal.availableTime;

    return totalMinutes + weeklyMinutes;
  }, 0);
}

function formatFocusTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function GoalsDashboard({
  canDeleteGoals,
  deletingGoalId = null,
  error = null,
  goals,
  isGoalLimitEnabled,
  isLoading = false,
  maxGoals,
  onCreateClick,
  onDeleteGoal,
  onOpenGoal,
}: GoalsDashboardProps) {
  const { language, t } = useLanguage();
  const locale = language === 'ru' ? 'ru' : 'en-US';
  const canCreateGoal = !isGoalLimitEnabled || goals.length < maxGoals;
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const averageProgress =
    goals.length > 0
      ? Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length)
      : 0;
  const focusGoal = goals.find((goal) => goal.status === 'active') ?? goals[0];
  const nextAction = getNextAction(focusGoal, t);
  const streakDays =
    goals.length > 0
      ? Math.max(1, goals.filter((goal) => goal.status === 'active' || goal.progress > 0).length)
      : 0;
  const focusTime = formatFocusTime(getWeeklyFocusMinutes(goals));

  return (
    <div className="page-stack">
      <section className="mentor-home" aria-label={t.aiMentor}>
        <div className="mentor-card">
          <div className="mentor-orb" aria-hidden="true">
            AI
          </div>
          <div className="mentor-copy">
            <span className="eyebrow">{t.aiMentor}</span>
            <h1>{t.todayQuestion}</h1>
            <p>{nextAction}</p>
            <div className="mentor-actions">
              {focusGoal ? (
                <Button onClick={() => onOpenGoal(focusGoal.id)}>{t.openGoal}</Button>
              ) : (
                <Button onClick={onCreateClick}>{t.createGoal}</Button>
              )}
              <Button disabled={!canCreateGoal} variant="secondary" onClick={onCreateClick}>
                {t.newGoal}
              </Button>
            </div>
          </div>
        </div>

        <aside className="mentor-side-panel" aria-label={t.progress}>
          <div>
            <span>{t.focus}</span>
            <strong>{focusGoal?.title ?? t.noGoal}</strong>
          </div>
          <div className="mentor-progress">
            <span>{t.overallProgress}</span>
            <strong>{averageProgress}%</strong>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${averageProgress}%` }} />
            </div>
          </div>
          <div className="mentor-stats-row">
            <span>
              {isGoalLimitEnabled ? `${goals.length}/${maxGoals}` : goals.length} {t.goals}
            </span>
            <span>
              {activeGoals} {t.activeGoals}
            </span>
          </div>
        </aside>
      </section>

      <section className="dashboard-stat-grid" aria-label={t.weeklyStats}>
        <article className="dashboard-stat-card">
          <img className="dashboard-stat-icon" src={streakIcon} alt="" aria-hidden="true" />
          <div>
            <span>{t.streak}</span>
            <strong>{streakDays}</strong>
            <small>{streakDays === 1 ? t.dayInARow : t.daysInARow}</small>
          </div>
        </article>
        <article className="dashboard-stat-card">
          <img className="dashboard-stat-icon" src={focusTimeIcon} alt="" aria-hidden="true" />
          <div>
            <span>{t.focusTime}</span>
            <strong>{focusTime}</strong>
            <small>{t.thisWeek}</small>
          </div>
        </article>
      </section>

      {isGoalLimitEnabled && !canCreateGoal ? (
        <section className="state-panel limit-panel">
          <h2>{t.createGoalLimitReached}</h2>
          <p>{t.createGoalLimit(maxGoals)}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="state-panel" aria-live="polite">
          <h2>{t.loadingGoals}</h2>
          <p>{t.loadingGoalsDescription}</p>
        </section>
      ) : null}

      {error ? (
        <section className="state-panel state-panel-error" role="alert">
          <h2>{language === 'ru' ? 'Не получилось загрузить цели' : 'Could not load goals'}</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && goals.length === 0 ? (
        <section className="state-panel empty-goals-panel">
          <h2>{t.noGoals}</h2>
          <p>{t.noGoalsDescription}</p>
          <Button onClick={onCreateClick}>{t.createGoal}</Button>
        </section>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.myGoals}</span>
              <h2>{language === 'ru' ? 'Продолжай в своём темпе' : 'Keep going at your pace'}</h2>
            </div>
            <Button disabled={!canCreateGoal} variant="secondary" onClick={onCreateClick}>
              {t.createGoal}
            </Button>
          </div>

          <section className="goal-grid" aria-label={t.goals}>
            {goals.map((goal) => (
              <article className="goal-card" key={goal.id}>
                <div className="goal-card-top">
                  <span className={`status-pill status-${goal.status}`}>{getStatusLabel(goal.status, t)}</span>
                  <span className="date-label">
                    {t.duePrefix} {formatDate(goal.targetDate, locale)}
                  </span>
                </div>
                <h2>{goal.title}</h2>
                <p>{goal.description || t.savedGoalDescription}</p>

                <div className="progress-row" aria-label={`${t.progress} ${goal.progress}%`}>
                  <span>{t.progress}</span>
                  <strong>{goal.progress}%</strong>
                </div>
                <div className="progress-bar" aria-hidden="true">
                  <span style={{ width: `${goal.progress}%` }} />
                </div>

                <div className="today-box">
                  <span>{t.today}</span>
                  <strong>
                    {goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? t.todayTaskFallback}
                  </strong>
                </div>

                <div className="goal-card-actions">
                  <Button variant="secondary" onClick={() => onOpenGoal(goal.id)}>
                    {t.open}
                  </Button>
                  {canDeleteGoals ? (
                    <Button
                      disabled={deletingGoalId === goal.id}
                      onClick={() => onDeleteGoal(goal.id)}
                      variant="danger"
                    >
                      {deletingGoalId === goal.id ? t.deleting : t.delete}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
