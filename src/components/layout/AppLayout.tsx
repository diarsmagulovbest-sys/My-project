import type { ReactNode } from 'react';
import { Button } from '../common/Button';
import type { AppNavTarget, AppPage } from '../../types/navigation';

type AppLayoutProps = {
  activePage: AppPage;
  children: ReactNode;
  onNavigate: (target: AppNavTarget) => void;
  onSignOut: () => void;
  userEmail?: string;
};

const navItems: Array<{
  id: string;
  label: string;
  icon: string;
  target: AppNavTarget;
}> = [
  { id: 'today', label: 'Today', icon: 'home', target: { page: 'today' } },
  { id: 'goals', label: 'Goals', icon: 'check', target: { page: 'goals' } },
  { id: 'roadmap', label: 'Roadmap', icon: 'roadmap', target: { page: 'roadmap' } },
  { id: 'tasks', label: 'Tasks', icon: 'tasks', target: { page: 'tasks' } },
  { id: 'progress', label: 'Progress', icon: 'progress', target: { page: 'progress' } },
  { id: 'mentor', label: 'AI Mentor', icon: 'mentor', target: { page: 'mentor' } },
  { id: 'achievements', label: 'Achievements', icon: 'achievements', target: { page: 'achievements' } },
  { id: 'settings', label: 'Settings', icon: 'settings', target: { page: 'settings' } },
];

function isActiveNavItem(item: (typeof navItems)[number], activePage: AppPage) {
  if (item.id === 'goals' && activePage === 'detail') {
    return true;
  }

  return item.target.page === activePage;
}

export function AppLayout({
  activePage,
  children,
  onNavigate,
  onSignOut,
  userEmail,
}: AppLayoutProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <span className="eyebrow">AI mentor</span>
            <strong>GoalPath</strong>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const target = item.target;

            return (
              <button
                className={isActiveNavItem(item, activePage) ? 'nav-item nav-item-active' : 'nav-item'}
                key={item.id}
                onClick={() => onNavigate(target)}
                type="button"
              >
                <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="account-box">
          <span>{userEmail ?? 'Account'}</span>
          <Button variant="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <section className="content-shell">{children}</section>
    </main>
  );
}
