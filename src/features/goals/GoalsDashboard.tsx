import { useEffect, useState, type CSSProperties } from 'react';
import { CheckIcon, GearIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '../../components/common/Button';
import { EmojiToken } from '../../components/common/EmojiToken';
import { useLanguage } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';
import type { DailyGoalTask } from '../../types/roadmap';
import { fetchDailyGoalTasks, setTaskImportance } from '../roadmap/roadmapApi';
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
  onCompleteTask: (goalId: string, taskId: string) => Promise<void> | void;
  onOpenGoals: () => void;
  onOpenGoal: (goalId: string) => void;
  onOpenSettings: () => void;
  completingTaskId?: string | null;
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

type GoalTheme = {
  accent: string;
  imageUrl: string;
};

const defaultGoalTheme: GoalTheme = {
  accent: '#f16f97',
  imageUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=900&q=80',
};

const goalThemes: Array<{ keywords: RegExp; theme: GoalTheme }> = [
  {
    keywords: /\b(japan|japanese|tokyo|kyoto|osaka|fuji|sakura|travel|trip|visit|vacation)\b/i,
    theme: {
      accent: '#d8718b',
      imageUrl: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(cook|cooking|bake|baking|recipe|pasta|alfredo|meal|dish|food)\b/i,
    theme: {
      accent: '#f0a33a',
      imageUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(code|coding|programming|app|website|project|launch|developer|javascript|react)\b/i,
    theme: {
      accent: '#f16f97',
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(run|running|5k|marathon|jog|fitness|workout|gym|train|training)\b/i,
    theme: {
      accent: '#f16f97',
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(meditate|meditation|mindful|mindfulness|calm|focus|breathing)\b/i,
    theme: {
      accent: '#f0a33a',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(study|exam|school|math|english|language|learn|reading|ielts|sat)\b/i,
    theme: {
      accent: '#8fb8ff',
      imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80',
    },
  },
  {
    keywords: /\b(music|guitar|piano|sing|song|drum|violin)\b/i,
    theme: {
      accent: '#b98cff',
      imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
    },
  },
];

function getGoalTheme(goal: GoalSummary) {
  const searchableText = [
    goal.title,
    goal.description,
    goal.aiAnalysis?.goalSummary,
    goal.aiAnalysis?.firstSmallAction,
  ].join(' ');

  return goalThemes.find((entry) => entry.keywords.test(searchableText))?.theme ?? defaultGoalTheme;
}

function getLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  return new Date(year, month - 1, day);
}

function getTodayDate() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getDaysBetween(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
}

function getGoalTimeStats(goal: GoalSummary) {
  const createdDate = getLocalDate(goal.createdAt);
  const targetDate = getLocalDate(goal.targetDate);
  const today = getTodayDate();
  const totalDays = Math.max(1, getDaysBetween(createdDate, targetDate));
  const daysRemaining = Math.max(0, getDaysBetween(today, targetDate));
  const elapsedRatio = Math.min(1, Math.max(0, (totalDays - daysRemaining) / totalDays));

  return {
    daysRemaining,
    progressDegrees: Math.max(18, Math.round(elapsedRatio * 360)),
  };
}

function formatShortDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

function getGoalSubline(goal: GoalSummary) {
  if (goal.progress > 0) {
    return `${goal.progress}% complete`;
  }

  return goal.description || 'Fresh start';
}

function getGoalNote(goal: GoalSummary, locale: string, daysRemaining: number) {
  if (daysRemaining === 0) {
    return `Due ${formatShortDate(goal.targetDate, locale)}`;
  }

  return `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`;
}

function getMobileGoalCardStyle(goal: GoalSummary) {
  const theme = getGoalTheme(goal);
  const timeStats = getGoalTimeStats(goal);

  return {
    '--mobile-goal-accent': theme.accent,
    '--mobile-goal-image': `url("${theme.imageUrl}")`,
    '--mobile-goal-progress': `${timeStats.progressDegrees}deg`,
  } as CSSProperties;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function formatTaskDueDate(value: string | null, locale: string) {
  if (!value) {
    return 'Anytime';
  }

  const today = new Date().toISOString().slice(0, 10);

  if (value <= today) {
    return 'Today';
  }

  return formatShortDate(value, locale);
}

function getXpModifierLabels(task: DailyGoalTask) {
  return [
    task.isActivePractice ? 'practice +5' : '',
    task.producesResult ? 'result +5' : '',
    task.isImportant ? 'important +10' : '',
    task.isPassive ? 'passive -5' : '',
  ].filter(Boolean);
}

type DailyQuestBoardProps = {
  completingTaskId?: string | null;
  error: string | null;
  isLoading: boolean;
  locale: string;
  onCompleteTask: (task: DailyGoalTask) => void;
  onToggleImportant: (task: DailyGoalTask) => void;
  tasks: DailyGoalTask[];
  updatingImportantTaskId: string | null;
};

function DailyQuestBoard({
  completingTaskId = null,
  error,
  isLoading,
  locale,
  onCompleteTask,
  onToggleImportant,
  tasks,
  updatingImportantTaskId,
}: DailyQuestBoardProps) {
  const earnedXp = tasks.reduce((total, task) => total + task.xpAwarded, 0);
  const availableXp = tasks
    .filter((task) => task.status !== 'completed')
    .reduce((total, task) => total + task.xpValue, 0);
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const totalXp = earnedXp + availableXp;
  const progressPercent = totalXp > 0 ? Math.round((earnedXp / totalXp) * 100) : 0;

  return (
    <section className="daily-quest-board" aria-label="Daily quests">
      <div className="daily-quest-hero">
        <div>
          <span className="daily-quest-kicker">Today board</span>
          <h2>Daily quests</h2>
          <p>Check off today's goal boxes. Every completed task pays XP instantly.</p>
        </div>
        <div className="daily-xp-orbit" aria-label={`${earnedXp} XP earned today`}>
          <strong>{earnedXp}</strong>
          <span>XP won</span>
        </div>
      </div>

      <div className="daily-board-stats" aria-label="Daily board progress">
        <span>{completedCount}/{tasks.length} checked</span>
        <span>{totalXp} XP pool</span>
        <span>{progressPercent}% cleared</span>
      </div>

      <div
        className="daily-xp-meter"
        style={{ '--daily-xp-progress': `${progressPercent}%` } as CSSProperties}
        aria-label={`${earnedXp} XP earned, ${availableXp} XP available`}
      >
        <div>
          <span>Earned</span>
          <strong>{earnedXp}/{totalXp} XP</strong>
        </div>
        <span aria-hidden="true" />
      </div>

      {isLoading ? (
        <div className="daily-quest-empty" aria-live="polite">
          <strong>Loading quests...</strong>
          <p>Checking today's goal tasks.</p>
        </div>
      ) : null}

      {error ? (
        <div className="daily-quest-empty daily-quest-error" role="alert">
          <strong>Daily quests need attention</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {!isLoading && !error && tasks.length === 0 ? (
        <div className="daily-quest-empty">
          <strong>No daily quests yet</strong>
          <p>Create a roadmap for a goal to unlock XP tasks here.</p>
        </div>
      ) : null}

      {!isLoading && !error && tasks.length > 0 ? (
        <div className="daily-quest-grid">
          {tasks.map((task) => {
            const modifierLabels = getXpModifierLabels(task);
            const isCompleted = task.status === 'completed';
            const isBoardSaving = Boolean(completingTaskId);
            const isCompleting = completingTaskId === task.id;
            const isUpdatingImportance = updatingImportantTaskId === task.id;
            const tileClassName = [
              'daily-quest-tile',
              isCompleted ? 'daily-quest-tile-done' : '',
              isCompleting ? 'daily-quest-tile-busy' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <article className={tileClassName} key={task.id}>
                <div className="daily-quest-tile-top">
                  <button
                    aria-label={isCompleted ? `${task.title} completed` : `Complete ${task.title}`}
                    className="daily-quest-check"
                    disabled={isCompleted || isBoardSaving}
                    onClick={() => onCompleteTask(task)}
                    type="button"
                  >
                    {isCompleted ? <CheckIcon aria-hidden="true" /> : null}
                  </button>
                  <strong className="daily-quest-xp">{isCompleted ? `+${task.xpAwarded}` : task.xpValue} XP</strong>
                </div>

                <div className="daily-quest-tile-copy">
                  <span className="daily-quest-goal">{task.goalTitle}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                </div>

                <div className="daily-quest-meta">
                  <span>{formatTaskDueDate(task.dueDate, locale)}</span>
                  <span>{task.estimatedMinutes}m</span>
                  <span>{task.difficulty}</span>
                </div>

                {modifierLabels.length > 0 ? (
                  <div className="daily-quest-modifiers" aria-label="XP modifiers">
                    {modifierLabels.slice(0, 3).map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                ) : null}

                <div className="daily-quest-actions">
                  <button
                    className={task.isImportant ? 'daily-important-button daily-important-button-on' : 'daily-important-button'}
                    disabled={isUpdatingImportance || isCompleted || isBoardSaving}
                    onClick={() => onToggleImportant(task)}
                    type="button"
                  >
                    Important
                  </button>
                  <span className="daily-quest-state">{isCompleted ? 'Checked' : isCompleting ? 'Checking' : 'Open'}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function GoalsDashboard({
  canDeleteGoals,
  deletingGoalId = null,
  error = null,
  goals,
  isGoalLimitEnabled,
  isLoading = false,
  maxGoals,
  completingTaskId = null,
  onCompleteTask,
  onCreateClick,
  onDeleteGoal,
  onOpenGoals,
  onOpenGoal,
  onOpenSettings,
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
  const streakDays =
    goals.length > 0
      ? Math.max(1, goals.filter((goal) => goal.status === 'active' || goal.progress > 0).length)
      : 0;
  const focusTime = formatFocusTime(getWeeklyFocusMinutes(goals));
  const [dailyTasks, setDailyTasks] = useState<DailyGoalTask[]>([]);
  const [dailyTasksError, setDailyTasksError] = useState<string | null>(null);
  const [isDailyTasksLoading, setIsDailyTasksLoading] = useState(false);
  const [updatingImportantTaskId, setUpdatingImportantTaskId] = useState<string | null>(null);
  const questCopy = {
    activeGoals: 'Active goals',
    createNewGoal: 'Create new goal',
    focusTime: 'Focus time',
    goalWorlds: 'Goal Worlds',
    nextTask: 'Next step',
    pathStatistics: 'Path Statistics',
    startNextStep: 'Start next step',
    streak: 'Streak',
    todayFocus: 'Today focus',
    upcomingMilestone: 'Upcoming milestone',
    viewAll: 'View all realms',
  };
  const goalsCopy = {
    activeQuests: 'Active quests',
    averageProgress: 'Average progress',
    createNewGoal: 'Create new goal',
    focusTime: 'Focus time',
    goalWorlds: 'Goal Worlds',
    nextTask: 'Next task',
    open: 'Open',
    pageSubtitle: 'Track every learning world, review progress, and jump back into the next useful step.',
    pageTitle: 'Goal Worlds',
    totalGoals: 'Total goals',
  };

  useEffect(() => {
    let isActive = true;

    if (view !== 'today' || goals.length === 0) {
      setDailyTasks([]);
      setDailyTasksError(null);
      setIsDailyTasksLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsDailyTasksLoading(true);
    setDailyTasksError(null);

    fetchDailyGoalTasks(goals.map((goal) => goal.id))
      .then((tasks) => {
        if (isActive) {
          setDailyTasks(tasks);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setDailyTasksError(error instanceof Error ? error.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsDailyTasksLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [goals, view]);

  const handleCompleteDailyTask = async (task: DailyGoalTask) => {
    setDailyTasksError(null);

    try {
      await onCompleteTask(task.goalId, task.id);
      setDailyTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id
            ? {
                ...currentTask,
                completedAt: new Date().toISOString(),
                status: 'completed',
                xpAwarded: currentTask.xpValue,
              }
            : currentTask,
        ),
      );
    } catch (error) {
      setDailyTasksError(error instanceof Error ? error.message : 'Task completion failed');
    }
  };

  const handleToggleImportant = async (task: DailyGoalTask) => {
    setUpdatingImportantTaskId(task.id);
    setDailyTasksError(null);

    try {
      const updatedTask = await setTaskImportance(task.goalId, task.id, !task.isImportant);

      setDailyTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === updatedTask.id
            ? {
                ...currentTask,
                ...updatedTask,
              }
            : currentTask,
        ),
      );
    } catch (error) {
      setDailyTasksError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setUpdatingImportantTaskId(null);
    }
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
                <Button data-tour="create-goal" disabled={!canCreateGoal} onClick={onCreateClick}>
                  {goalsCopy.createNewGoal}
                </Button>
              </header>

              {goals.length === 0 ? (
                <section className="goals-stitch-empty">
                  <h2>{t.noGoals}</h2>
                  <p>{t.noGoalsDescription}</p>
                  <Button data-tour="create-goal" onClick={onCreateClick}>{goalsCopy.createNewGoal}</Button>
                </section>
              ) : null}
            </div>

            <aside className="goals-stitch-side" aria-label={goalsCopy.nextTask}>
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
    <div className="page-stack dashboard-page today-stitch-page">
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
          <Button data-tour="create-goal" onClick={onCreateClick}>{t.createGoal}</Button>
        </section>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <>
          <section className="mobile-goal-feed" aria-label={t.today}>
            <header className="mobile-goal-feed-header">
              <div>
                <span className="mobile-goal-feed-kicker">{questCopy.todayFocus}</span>
                <h1>{getGreeting()}</h1>
              </div>
              <div className="mobile-goal-feed-actions">
                <button
                  aria-label={t.createGoal}
                  className="mobile-feed-icon-button mobile-feed-icon-button-primary"
                  data-tour="create-goal"
                  disabled={!canCreateGoal}
                  onClick={onCreateClick}
                  type="button"
                >
                  <PlusIcon />
                </button>
                <button
                  aria-label={t.navSettings}
                  className="mobile-feed-icon-button mobile-feed-icon-button-secondary"
                  onClick={onOpenSettings}
                  type="button"
                >
                  <GearIcon />
                </button>
              </div>
            </header>

            <div data-tour="today-board">
            <DailyQuestBoard
              completingTaskId={completingTaskId}
              error={dailyTasksError}
              isLoading={isDailyTasksLoading}
              locale={locale}
              onCompleteTask={(task) => void handleCompleteDailyTask(task)}
              onToggleImportant={(task) => void handleToggleImportant(task)}
              tasks={dailyTasks}
              updatingImportantTaskId={updatingImportantTaskId}
            />
            </div>

            <div className="mobile-goal-card-list">
              {goals.map((goal) => {
                const timeStats = getGoalTimeStats(goal);

                return (
                  <button
                    aria-label={`${goal.title}, ${timeStats.daysRemaining} days remaining`}
                    className="mobile-goal-card"
                    key={goal.id}
                    onClick={() => onOpenGoal(goal.id)}
                    style={getMobileGoalCardStyle(goal)}
                    type="button"
                  >
                    <span className="mobile-goal-card-shade" aria-hidden="true" />
                    <span className="mobile-goal-card-copy">
                      <strong>{goal.title}</strong>
                      <span>{getGoalSubline(goal)}</span>
                      <small>{getGoalNote(goal, locale, timeStats.daysRemaining)}</small>
                    </span>
                    <span
                      aria-label={`${timeStats.daysRemaining} days remaining`}
                      className="mobile-days-ring"
                      role="img"
                    >
                      <strong>{timeStats.daysRemaining}</strong>
                      <span>days</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="stitch-dashboard stitch-dashboard-desktop" aria-label={t.today}>
          <div className="stitch-main">
            <header className="stitch-welcome">
              <span className="eyebrow">{questCopy.todayFocus}</span>
              <h1>{getGreeting()}, Dreamer</h1>
            </header>

            <div data-tour="today-board">
            <DailyQuestBoard
              completingTaskId={completingTaskId}
              error={dailyTasksError}
              isLoading={isDailyTasksLoading}
              locale={locale}
              onCompleteTask={(task) => void handleCompleteDailyTask(task)}
              onToggleImportant={(task) => void handleToggleImportant(task)}
              tasks={dailyTasks}
              updatingImportantTaskId={updatingImportantTaskId}
            />
            </div>

            <section className="stitch-quest" aria-label={focusGoal?.title ?? t.noGoal}>
              <h2>{focusGoal?.title ?? t.noGoal}</h2>
              <p>{focusGoal?.description || focusGoal?.aiAnalysis?.goalSummary || t.savedGoalDescription}</p>

              <div className="stitch-quest-meta">
                <EmojiToken
                  className="stitch-quest-avatar"
                  label={focusGoalIcon.label}
                  symbol={focusGoalIcon.symbol}
                  tone={focusGoalIcon.tone}
                />
                <div>
                  <strong>{nextAction}</strong>
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
                  <Button data-tour="create-goal" onClick={onCreateClick}>{t.createGoal}</Button>
                )}
                <Button data-tour="create-goal" disabled={!canCreateGoal} variant="secondary" onClick={onCreateClick}>
                  New goal
                </Button>
              </div>
            </section>

            <section className="stitch-goals-section" aria-label={t.goals}>
              <div className="stitch-section-header">
                <h2>{questCopy.goalWorlds}</h2>
                <Button variant="ghost" onClick={onOpenGoals}>
                  {questCopy.viewAll}
                </Button>
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
                  <button className="stitch-create-card" data-tour="create-goal" onClick={onCreateClick} type="button">
                    <span aria-hidden="true">+</span>
                    <strong>{questCopy.createNewGoal}</strong>
                  </button>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="stitch-side" aria-label={t.weeklyStats}>
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
        </>
      ) : null}
    </div>
  );
}
