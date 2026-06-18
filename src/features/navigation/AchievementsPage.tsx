import { Button } from '../../components/common/Button';
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
  const completedGoals = goals.filter((goal) => goal.status === 'completed' || goal.progress === 100).length;
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const averageProgress = getAverageProgress(goals);
  const achievements = [
    {
      isUnlocked: goals.length > 0,
      label: 'First goal',
      text: 'Create your first learning goal.',
    },
    {
      isUnlocked: goals.some((goal) => goal.progress > 0),
      label: 'Started moving',
      text: 'Make progress on any goal.',
    },
    {
      isUnlocked: goals.length >= 3,
      label: 'Goal stack',
      text: 'Track three goals at the same time.',
    },
    {
      isUnlocked: completedGoals > 0,
      label: 'Finisher',
      text: 'Complete one goal.',
    },
  ];

  return (
    <div className="page-stack">
      <section className="feature-panel">
        <span className="eyebrow">Achievements</span>
        <h1>Your progress badges</h1>
        <p>These badges are calculated from the goals already saved in your app.</p>
        <div className="feature-actions">
          <Button onClick={onOpenGoals}>Open goals</Button>
          <Button variant="secondary" onClick={onCreateGoal}>
            Create goal
          </Button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Achievement stats">
        <div className="metric-card">
          <span>Total goals</span>
          <strong>{goals.length}</strong>
        </div>
        <div className="metric-card">
          <span>Active goals</span>
          <strong>{activeGoals}</strong>
        </div>
        <div className="metric-card">
          <span>Completed</span>
          <strong>{completedGoals}</strong>
        </div>
        <div className="metric-card">
          <span>Average progress</span>
          <strong>{averageProgress}%</strong>
        </div>
      </section>

      <section className="achievement-grid" aria-label="Badges">
        {achievements.map((achievement) => (
          <article
            className={achievement.isUnlocked ? 'achievement-card achievement-card-unlocked' : 'achievement-card'}
            key={achievement.label}
          >
            <span>{achievement.isUnlocked ? 'Unlocked' : 'Locked'}</span>
            <h2>{achievement.label}</h2>
            <p>{achievement.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
