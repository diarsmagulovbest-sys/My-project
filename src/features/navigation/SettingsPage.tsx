import { Button } from '../../components/common/Button';

type SettingsPageProps = {
  canDeleteGoals: boolean;
  isGoalLimitEnabled: boolean;
  maxGoals: number;
  onOpenGoals: () => void;
  onSignOut: () => void;
  userEmail?: string;
};

export function SettingsPage({
  canDeleteGoals,
  isGoalLimitEnabled,
  maxGoals,
  onOpenGoals,
  onSignOut,
  userEmail,
}: SettingsPageProps) {
  return (
    <div className="page-stack">
      <section className="feature-panel">
        <span className="eyebrow">Settings</span>
        <h1>Account and goal settings</h1>
        <p>Manage the account session and see the limits currently enabled in the app.</p>
        <div className="feature-actions">
          <Button onClick={onOpenGoals}>Open goals</Button>
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>

      <section className="settings-grid" aria-label="Settings">
        <article className="settings-card">
          <span>Signed in as</span>
          <strong>{userEmail ?? 'Account'}</strong>
        </article>
        <article className="settings-card">
          <span>Goal limit</span>
          <strong>{isGoalLimitEnabled ? `${maxGoals} goals` : 'Off'}</strong>
        </article>
        <article className="settings-card">
          <span>Goal deletion</span>
          <strong>{canDeleteGoals ? 'Enabled' : 'Disabled'}</strong>
        </article>
      </section>
    </div>
  );
}
