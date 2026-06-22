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
    createNewGoal: language === 'ru' ? 'Создать новую цель' : 'Create new goal',
    startNextStep: language === 'ru' ? 'Начать шаг' : 'Start next step',
    todaysQuest: language === 'ru' ? 'Квест на сегодня' : "Today's Quest",
    upcomingMilestone: language === 'ru' ? 'Ближайший рубеж' : 'Upcoming milestone',
    viewAll: language === 'ru' ? 'Все цели' : 'View all realms',
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
        <section className="stitch-dashboard" aria-label={t.today}>
          <div className="stitch-main">
            <header className="stitch-welcome">
              <h1>{language === 'ru' ? 'Добро пожаловать в GoalPath' : 'Good morning, Dreamer'}</h1>
              <p>
                {language === 'ru'
                  ? 'Сегодня выбери один понятный шаг и продвинься в своём темпе.'
                  : 'The path ahead is ready for one clear step today.'}
              </p>
            </header>

            <section className="stitch-quest" aria-label={questCopy.todaysQuest}>
              <span className="stitch-quest-pill">{questCopy.activeQuest}</span>
              <h2>{questCopy.todaysQuest}</h2>
              <p>{nextAction}</p>

              <div className="stitch-quest-meta">
                <span className="stitch-quest-avatar" aria-hidden="true">
                  {getGoalEmoji(focusGoal)}
                </span>
                <div>
                  <strong>{focusGoal?.title ?? t.noGoal}</strong>
                  <span>{questCopy.nextTask}</span>
                </div>
                <div className="stitch-quest-progress" aria-hidden="true">
                  <span style={{ width: `${focusGoal?.progress ?? averageProgress}%` }} />
                </div>
              </div>

              <div className="stitch-actions">
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
            </section>

            <section className="stitch-goals-section" aria-label={t.goals}>
              <div className="stitch-section-header">
                <h2>{questCopy.goalWorlds}</h2>
                <button disabled={!canCreateGoal} onClick={onCreateClick} type="button">
                  {questCopy.viewAll}
                </button>
              </div>

              <div className="stitch-goal-grid">
                {goals.map((goal, index) => (
                  <article className={`stitch-goal-card ${getGoalAccentClass(index)}`} key={goal.id}>
                    <div className="stitch-goal-icon" aria-hidden="true">
                      {getGoalEmoji(goal)}
                    </div>
                    <div className="stitch-goal-copy">
                      <span className={`status-pill status-${goal.status}`}>{getStatusLabel(goal.status, t)}</span>
                      <h3>{goal.title}</h3>
                      <p>{goal.description || t.savedGoalDescription}</p>
                    </div>

                    <div className="stitch-card-progress" aria-label={`${t.progress} ${goal.progress}%`}>
                      <div>
                        <span>{t.progress}</span>
                        <strong>{goal.progress}%</strong>
                      </div>
                      <div className="progress-bar" aria-hidden="true">
                        <span style={{ width: `${goal.progress}%` }} />
                      </div>
                    </div>

                    <div className="stitch-next-task">
                      <span>{questCopy.nextTask}</span>
                      <strong>
                        {goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? t.todayTaskFallback}
                      </strong>
                    </div>

                    <div className="stitch-card-actions">
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
                  <button className="stitch-create-card" onClick={onCreateClick} type="button">
                    <span aria-hidden="true">+</span>
                    <strong>{questCopy.createNewGoal}</strong>
                  </button>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="stitch-side" aria-label={t.aiMentor}>
            <section className="stitch-mentor-card">
              <div className="stitch-mentor-avatar" aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <strong>{companion.name}</strong>
              <span>{t.aiMentor}</span>
              <p>{questCopy.companionQuote}</p>
            </section>

            <section className="stitch-stat-stack" aria-label={t.weeklyStats}>
              <h2>{questCopy.pathStatistics}</h2>
              <article className="stitch-stat-card">
                <span className="stitch-stat-icon" aria-hidden="true">★</span>
                <div>
                  <span>{t.activeGoals}</span>
                  <strong>{activeGoals}</strong>
                </div>
              </article>
              <article className="stitch-stat-card">
                <img className="stitch-stat-icon" src={focusTimeIcon} alt="" aria-hidden="true" />
                <div>
                  <span>{t.focusTime}</span>
                  <strong>{focusTime}</strong>
                </div>
              </article>
              <article className="stitch-stat-card">
                <img className="stitch-stat-icon" src={streakIcon} alt="" aria-hidden="true" />
                <div>
                  <span>{t.streak}</span>
                  <strong>{streakDays}</strong>
                </div>
              </article>
            </section>

            <section className="stitch-milestone-card" aria-label={questCopy.upcomingMilestone}>
              <span>{questCopy.upcomingMilestone}</span>
              <strong>{focusGoal?.todayTask?.title ?? focusGoal?.title ?? t.noGoal}</strong>
              <small>
                {focusGoal ? `${t.duePrefix} ${formatDate(focusGoal.targetDate, locale)}` : t.noDate}
              </small>
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
