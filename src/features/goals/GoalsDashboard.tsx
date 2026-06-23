import { Button } from '../../components/common/Button';
import { EmojiToken } from '../../components/common/EmojiToken';
import { useLanguage } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';
import { getActiveMentorCharacterId, getMentorCharacter } from '../mentor/mentorCharacters';
import { getGoalIcon } from './goalEmoji';

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
  view: 'goals' | 'today';
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
  view,
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
  const focusGoalIcon = getGoalIcon(focusGoal);
  const nextAction = getNextAction(focusGoal, t);
  const companion = getMentorCharacter(getActiveMentorCharacterId());
  const companionFallback = companion.shortName.slice(0, 2);
  const streakDays =
    goals.length > 0
      ? Math.max(1, goals.filter((goal) => goal.status === 'active' || goal.progress > 0).length)
      : 0;
  const focusTime = formatFocusTime(getWeeklyFocusMinutes(goals));
  const questCopy = {
    activeGoals: 'Active goals',
    activeQuest: 'ACTIVE QUEST',
    companionQuote: 'I will help you choose the next small step. Keep it calm, keep it moving.',
    createNewGoal: 'Create new goal',
    focusTime: 'Focus time',
    goalWorlds: 'Goal Worlds',
    nextTask: 'Next task',
    pathStatistics: 'Path Statistics',
    startNextStep: 'Start next step',
    streak: 'Streak',
    subtitle: 'The path ahead is ready for one clear step today.',
    title: 'Good morning, Dreamer',
    todaysQuest: "Today's Quest",
    upcomingMilestone: 'Upcoming milestone',
    viewAll: 'View all realms',
  };
  const goalsCopy = {
    activeQuests: 'Active quests',
    averageProgress: 'Average progress',
    createNewGoal: 'Create new goal',
    focusTime: 'Focus time',
    goalWorlds: 'Goal Worlds',
    mentorNote: 'Keep each goal moving with one clear step, then open the quest when you are ready to continue.',
    nextTask: 'Next task',
    open: 'Open',
    pageSubtitle: 'Track every learning world, review progress, and jump back into the next useful step.',
    pageTitle: 'Goal Worlds',
    totalGoals: 'Total goals',
  };

  if (view === 'goals') {
    return (
      <div className="page-stack dashboard-page goals-stitch-page">
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

        {!isLoading && !error ? (
          <section className="goals-stitch-layout" aria-label={goalsCopy.goalWorlds}>
            <div className="goals-stitch-main">
              <header className="goals-stitch-header">
                <div>
                  <span>Ongoing quests</span>
                  <h1>{goalsCopy.pageTitle}</h1>
                  <p>{goalsCopy.pageSubtitle}</p>
                </div>
                <Button disabled={!canCreateGoal} onClick={onCreateClick}>
                  {goalsCopy.createNewGoal}
                </Button>
              </header>

              <section className="goals-stitch-stats" aria-label="Goal stats">
                <article>
                  <span>{goalsCopy.totalGoals}</span>
                  <strong>{isGoalLimitEnabled ? `${goals.length}/${maxGoals}` : goals.length}</strong>
                </article>
                <article>
                  <span>{goalsCopy.activeQuests}</span>
                  <strong>{activeGoals}</strong>
                </article>
                <article>
                  <span>{goalsCopy.focusTime}</span>
                  <strong>{focusTime}</strong>
                </article>
                <article>
                  <span>{goalsCopy.averageProgress}</span>
                  <strong>{averageProgress}%</strong>
                </article>
              </section>

              {goals.length === 0 ? (
                <section className="goals-stitch-empty">
                  <h2>{t.noGoals}</h2>
                  <p>{t.noGoalsDescription}</p>
                  <Button onClick={onCreateClick}>{goalsCopy.createNewGoal}</Button>
                </section>
              ) : (
                <section className="goals-world-board" aria-label={goalsCopy.activeQuests}>
                  <div className="goals-board-heading">
                    <h2>{goalsCopy.activeQuests}</h2>
                    <span>{goals.length} realms</span>
                  </div>

                  <div className="goals-world-grid">
                    {goals.map((goal, index) => {
                      const goalIcon = getGoalIcon(goal);

                      return (
                        <article className={`goals-world-card ${getGoalAccentClass(index)}`} key={goal.id}>
                          <div className="goals-world-top">
                            <EmojiToken
                              className="goals-world-icon"
                              label={goalIcon.label}
                              symbol={goalIcon.symbol}
                              tone={goalIcon.tone}
                            />
                            <div>
                              <span className={`status-pill status-${goal.status}`}>
                                {getStatusLabel(goal.status, t)}
                              </span>
                              <h3>{goal.title}</h3>
                            </div>
                          </div>

                          <p>{goal.description || t.savedGoalDescription}</p>

                          <div className="goals-world-progress" aria-label={`${t.progress} ${goal.progress}%`}>
                            <div>
                              <span>{t.progress}</span>
                              <strong>{goal.progress}%</strong>
                            </div>
                            <div className="progress-bar" aria-hidden="true">
                              <span style={{ width: `${goal.progress}%` }} />
                            </div>
                          </div>

                          <div className="goals-world-task">
                            <span>{goalsCopy.nextTask}</span>
                            <strong>
                              {goal.todayTask?.title ?? goal.aiAnalysis?.firstSmallAction ?? t.todayTaskFallback}
                            </strong>
                          </div>

                          <div className="goals-world-actions">
                            <Button variant="secondary" onClick={() => onOpenGoal(goal.id)}>
                              {goalsCopy.open}
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
                      );
                    })}

                    {canCreateGoal ? (
                      <button className="goals-create-card" onClick={onCreateClick} type="button">
                        <span aria-hidden="true">+</span>
                        <strong>{goalsCopy.createNewGoal}</strong>
                      </button>
                    ) : null}
                  </div>
                </section>
              )}
            </div>

            <aside className="goals-stitch-side" aria-label="Goal mentor panel">
              <section className="goals-mentor-panel">
                <div className={`stitch-mentor-avatar stitch-mentor-avatar-${companion.id}`} aria-hidden="true">
                  {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
                </div>
                <div>
                  <strong>{companion.name}</strong>
                  <span>AI Mentor</span>
                </div>
                <p>{goalsCopy.mentorNote}</p>
              </section>

              <section className="goals-tip-card">
                <span>{goalsCopy.nextTask}</span>
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
              <h1>{questCopy.title}</h1>
              <p>{questCopy.subtitle}</p>
            </header>

            <section className="stitch-quest" aria-label={questCopy.todaysQuest}>
              <span className="stitch-quest-pill">{questCopy.activeQuest}</span>
              <h2>{questCopy.todaysQuest}</h2>
              <p>{nextAction}</p>

              <div className="stitch-quest-meta">
                <EmojiToken
                  className="stitch-quest-avatar"
                  label={focusGoalIcon.label}
                  symbol={focusGoalIcon.symbol}
                  tone={focusGoalIcon.tone}
                />
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
                  New goal
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
                {goals.map((goal, index) => {
                  const goalIcon = getGoalIcon(goal);

                  return (
                    <article className={`stitch-goal-card ${getGoalAccentClass(index)}`} key={goal.id}>
                      <EmojiToken
                        className="stitch-goal-icon"
                        label={goalIcon.label}
                        symbol={goalIcon.symbol}
                        tone={goalIcon.tone}
                      />
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
                  );
                })}

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
              <div className={`stitch-mentor-avatar stitch-mentor-avatar-${companion.id}`} aria-hidden="true">
                {companion.avatarPath ? <img src={companion.avatarPath} alt="" /> : <span>{companionFallback}</span>}
              </div>
              <strong>{companion.name}</strong>
              <span>AI Mentor</span>
              <p>{questCopy.companionQuote}</p>
            </section>

            <section className="stitch-stat-stack" aria-label={t.weeklyStats}>
              <h2>{questCopy.pathStatistics}</h2>
              <article className="stitch-stat-card">
                <EmojiToken className="stitch-stat-icon" label={questCopy.activeGoals} symbol="★" tone="pink" />
                <div>
                  <span>{questCopy.activeGoals}</span>
                  <strong>{activeGoals}</strong>
                </div>
              </article>
              <article className="stitch-stat-card">
                <EmojiToken className="stitch-stat-icon" label={questCopy.focusTime} symbol="↗" tone="blue" />
                <div>
                  <span>{questCopy.focusTime}</span>
                  <strong>{focusTime}</strong>
                </div>
              </article>
              <article className="stitch-stat-card">
                <EmojiToken className="stitch-stat-icon" label={questCopy.streak} symbol="🔥" tone="accent" />
                <div>
                  <span>{questCopy.streak}</span>
                  <strong>{streakDays}</strong>
                </div>
              </article>
            </section>

            <section className="stitch-milestone-card" aria-label={questCopy.upcomingMilestone}>
              <div className="milestone-card-heading">
                <EmojiToken className="stitch-stat-icon" label={questCopy.upcomingMilestone} symbol="✦" tone="pink" />
                <div>
                  <span>{questCopy.upcomingMilestone}</span>
                  <strong>{focusGoal?.todayTask?.title ?? focusGoal?.title ?? t.noGoal}</strong>
                  <small>
                    {focusGoal ? `${t.duePrefix} ${formatDate(focusGoal.targetDate, locale)}` : t.noDate}
                  </small>
                </div>
              </div>
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
