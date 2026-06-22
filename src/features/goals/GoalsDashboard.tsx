import { Button } from '../../components/common/Button';
import focusTimeIcon from '../../assets/ui/focus-time.svg';
import streakIcon from '../../assets/ui/streak-flame.svg';
import { useLanguage } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';
import { getActiveMentorCharacterId, getMentorCharacter } from '../mentor/mentorCharacters';
import { getGoalEmoji } from './goalEmoji';

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

function getGoalAccentClass(index: number) {
  return `goal-card-accent-${(index % 3) + 1}`;
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
  const companion = getMentorCharacter(getActiveMentorCharacterId());
  const companionFallback = companion.shortName.slice(0, 2);
  const streakDays =
    goals.length > 0
      ? Math.max(1, goals.filter((goal) => goal.status === 'active' || goal.progress > 0).length)
      : 0;
  const focusTime = formatFocusTime(getWeeklyFocusMinutes(goals));
  const questCopy = {
    activeQuest: language === 'ru' ? 'Активный квест' : 'Active quest',
    companionQuote:
      language === 'ru'
        ? 'Я помогу выбрать следующий маленький шаг. Двигайся спокойно, но уверенно.'
        : 'I will help you choose the next small step. Keep it calm, keep it moving.',
    goalWorlds: language === 'ru' ? 'Миры целей' : 'Goal Worlds',
    nextTask: language === 'ru' ? 'Следующее задание' : 'Next task',
    pathStatistics: language === 'ru' ? 'Статистика пути' : 'Path statistics',
    plantNewSeed: language === 'ru' ? 'Посадить новую цель' : 'Plant a new seed',
    startNextStep: language === 'ru' ? 'Начать шаг' : 'Start next step',
    todaysQuest: language === 'ru' ? 'Квест на сегодня' : "Today's Quest",
    upcomingMilestone: language === 'ru' ? 'Ближайший рубеж' : 'Upcoming milestone',
  };

  return (
    <div className="page-stack dashboard-page">
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
          <h2>Could not load goals</h2>
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
        <section className="dashboard-stitch-layout" aria-label={t.today}>
          <div className="dashboard-main-column">
            <header className="dashboard-welcome">
              <span className="eyebrow">{t.today}</span>
              <h1>{language === 'ru' ? 'Добро пожаловать в GoalPath' : 'Good morning, Dreamer'}</h1>
              <p>
                {language === 'ru'
                  ? 'Сегодня выбери один понятный шаг и продвинься в своём темпе.'
                  : 'The path ahead is ready for one clear step today.'}
              </p>
            </header>

            <section className="mentor-home dashboard-quest-card" aria-label={questCopy.todaysQuest}>
              <div className="mentor-card">
                <div className="quest-pill">{questCopy.activeQuest}</div>
                <div className="mentor-copy">
                  <h2>{questCopy.todaysQuest}</h2>
                  <p>{nextAction}</p>
                  <div className="quest-focus-row">
                    <span className="quest-focus-avatar" aria-hidden="true">
                      {getGoalEmoji(focusGoal)}
                    </span>
                    <div>
                      <strong>{focusGoal?.title ?? t.noGoal}</strong>
                      <span>{questCopy.nextTask}</span>
                    </div>
                  </div>
                  <div className="quest-progress-line" aria-hidden="true">
                    <span style={{ width: `${focusGoal?.progress ?? averageProgress}%` }} />
                  </div>
                  <div className="mentor-actions">
                    {focusGoal ? (
                      <Button onClick={() => onOpenGoal(focusGoal.id)}>
                        {questCopy.startNextStep}
                      </Button>
                    ) : (
                      <Button onClick={onCreateClick}>{t.createGoal}</Button>
                    )}
                    <Button disabled={!canCreateGoal} variant="secondary" onClick={onCreateClick}>
                      {t.newGoal}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="section-heading dashboard-goal-worlds-heading">
              <div>
                <span className="eyebrow">{t.myGoals}</span>
                <h2>{questCopy.goalWorlds}</h2>
              </div>
              <Button disabled={!canCreateGoal} variant="secondary" onClick={onCreateClick}>
                {t.createGoal}
              </Button>
            </div>

            <section className="goal-grid dashboard-goal-worlds" aria-label={t.goals}>
              {goals.map((goal, index) => (
                <article className={`goal-card ${getGoalAccentClass(index)}`} key={goal.id}>
                  <div className="goal-card-top">
                    <span className={`status-pill status-${goal.status}`}>{getStatusLabel(goal.status, t)}</span>
                    <span className="date-label">
                      {t.duePrefix} {formatDate(goal.targetDate, locale)}
                    </span>
                  </div>
                  <div className="goal-title-row">
                    <span className="goal-emoji" aria-hidden="true">
                      {getGoalEmoji(goal)}
                    </span>
                    <h2>{goal.title}</h2>
                  </div>
                  <p>{goal.description || t.savedGoalDescription}</p>

                  <div className="progress-row" aria-label={`${t.progress} ${goal.progress}%`}>
                    <span>{t.level}</span>
                    <strong>{goal.progress}%</strong>
                  </div>
                  <div className="progress-bar" aria-hidden="true">
                    <span style={{ width: `${goal.progress}%` }} />
                  </div>

                  <div className="today-box">
                    <span>{questCopy.nextTask}</span>
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

              {canCreateGoal ? (
                <button className="goal-card goal-card-create" onClick={onCreateClick} type="button">
                  <span aria-hidden="true">+</span>
                  <strong>{questCopy.plantNewSeed}</strong>
                </button>
              ) : null}
            </section>
          </div>

          <aside className="dashboard-companion-column" aria-label={t.aiMentor}>
            <section className="mentor-side-panel dashboard-companion-card">
              <div className="companion-avatar" aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <div>
                <span>{t.aiMentor}</span>
                <strong>{companion.name}</strong>
              </div>
              <p>{questCopy.companionQuote}</p>
            </section>

            <section className="dashboard-stat-grid" aria-label={t.weeklyStats}>
              <span className="dashboard-side-title">{questCopy.pathStatistics}</span>
              <article className="dashboard-stat-card">
                <span className="dashboard-stat-badge" aria-hidden="true">★</span>
                <div>
                  <span>{t.activeGoals}</span>
                  <strong>{activeGoals}</strong>
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
              <article className="dashboard-stat-card">
                <img className="dashboard-stat-icon" src={streakIcon} alt="" aria-hidden="true" />
                <div>
                  <span>{t.streak}</span>
                  <strong>{streakDays}</strong>
                  <small>{streakDays === 1 ? t.dayInARow : t.daysInARow}</small>
                </div>
              </article>
            </section>

            <section className="dashboard-milestone-card" aria-label={questCopy.upcomingMilestone}>
              <span>{questCopy.upcomingMilestone}</span>
              <strong>{focusGoal?.todayTask?.title ?? focusGoal?.title ?? t.noGoal}</strong>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${focusGoal?.progress ?? averageProgress}%` }} />
              </div>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
