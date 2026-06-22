import { Button } from '../../components/common/Button';
import { useLanguage } from '../../lib/language';
import type { GoalSummary } from '../../types/goal';

type AchievementsPageProps = {
  goals: GoalSummary[];
  onCreateGoal: () => void;
  onOpenGoals: () => void;
};

function getAverageProgress(goals: GoalSummary[]) {
  if (goals.length === 0) {
    return 0;
  }

  return Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length);
}

export function AchievementsPage({ goals, onCreateGoal, onOpenGoals }: AchievementsPageProps) {
  const { t } = useLanguage();
  const completedGoals = goals.filter((goal) => goal.status === 'completed' || goal.progress === 100).length;
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const averageProgress = getAverageProgress(goals);
  const achievements = [
    {
      isUnlocked: goals.length > 0,
      label: t.firstGoal,
      text: t.firstGoalText,
    },
    {
      isUnlocked: goals.some((goal) => goal.progress > 0),
      label: t.startedMoving,
      text: t.startedMovingText,
    },
    {
      isUnlocked: goals.length >= 3,
      label: t.goalStack,
      text: t.goalStackText,
    },
    {
      isUnlocked: completedGoals > 0,
      label: t.finisher,
      text: t.finisherText,
    },
  ];

  return (
    <div className="page-stack achievements-stitch-page">
      <section className="feature-panel achievements-stitch-hero">
        <span className="eyebrow">{t.achievements}</span>
        <h1>{t.yourProgressBadges}</h1>
        <p>{t.yourProgressBadgesDescription}</p>
        <div className="feature-actions">
          <Button onClick={onOpenGoals}>{t.openGoals}</Button>
          <Button variant="secondary" onClick={onCreateGoal}>
            {t.createGoal}
          </Button>
        </div>
      </section>

      {goals.length === 0 ? (
        <section className="state-panel">
          <h2>{t.noAchievements}</h2>
          <p>{t.noAchievementsDescription}</p>
          <Button onClick={onCreateGoal}>{t.createGoal}</Button>
        </section>
      ) : (
        <>
          <section className="metric-grid" aria-label={t.achievementStats}>
            <div className="metric-card">
              <span>{t.totalGoals}</span>
              <strong>{goals.length}</strong>
            </div>
            <div className="metric-card">
              <span>{t.activeGoals}</span>
              <strong>{activeGoals}</strong>
            </div>
            <div className="metric-card">
              <span>{t.completed}</span>
              <strong>{completedGoals}</strong>
            </div>
            <div className="metric-card">
              <span>{t.averageProgress}</span>
              <strong>{averageProgress}%</strong>
            </div>
          </section>

          <section className="achievement-grid" aria-label={t.badges}>
            {achievements.map((achievement) => (
              <article
                className={achievement.isUnlocked ? 'achievement-card achievement-card-unlocked' : 'achievement-card'}
                key={achievement.label}
              >
                <span>{achievement.isUnlocked ? t.unlocked : t.locked}</span>
                <h2>{achievement.label}</h2>
                <p>{achievement.text}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
