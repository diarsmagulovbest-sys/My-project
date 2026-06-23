import type { ElementType, ReactNode } from 'react';
import {
  CheckCircledIcon,
  FaceIcon,
  GearIcon,
  HomeIcon,
} from '@radix-ui/react-icons';
import { Button } from '../common/Button';
import type { AppNavTarget, AppPage } from '../../types/navigation';
import goalpathLogo from '../../assets/ui/goalpath-logo.svg';
import { useLanguage } from '../../lib/language';

type AppLayoutProps = {
  activePage: AppPage;
  children: ReactNode;
  onNavigate: (target: AppNavTarget) => void;
  onSignOut: () => void;
  userEmail?: string;
};

function RoadmapPathIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 14.4c1.9-5.8 5.1-1.5 6.5-6.2 1-3.5 3.3-4.5 5.5-4.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="3" cy="14.4" r="1.5" fill="currentColor" />
      <circle cx="9.5" cy="8.2" r="1.5" fill="currentColor" />
      <circle cx="15" cy="3.6" r="1.5" fill="currentColor" />
    </svg>
  );
}

const navItems: Array<{
  id: string;
  labelKey:
    | 'navToday'
    | 'navGoals'
    | 'navRoadmap'
    | 'navMentorCharacters'
    | 'navSettings';
  Icon: ElementType;
  target: AppNavTarget;
}> = [
  { id: 'today', labelKey: 'navToday', Icon: HomeIcon, target: { page: 'today' } },
  { id: 'goals', labelKey: 'navGoals', Icon: CheckCircledIcon, target: { page: 'goals' } },
  {
    id: 'mentorCharacters',
    labelKey: 'navMentorCharacters',
    Icon: FaceIcon,
    target: { page: 'mentorCharacters' },
  },
  { id: 'roadmap', labelKey: 'navRoadmap', Icon: RoadmapPathIcon, target: { page: 'roadmap' } },
  { id: 'settings', labelKey: 'navSettings', Icon: GearIcon, target: { page: 'settings' } },
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
  const { t } = useLanguage();

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-block">
          <img className="brand-logo" src={goalpathLogo} alt="" aria-hidden="true" />
          <div>
            <span className="eyebrow">Your Magical Journey</span>
            <strong>GoalPath</strong>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const target = item.target;
            const Icon = item.Icon;

            return (
              <button
                className={isActiveNavItem(item, activePage) ? 'nav-item nav-item-active' : 'nav-item'}
                key={item.id}
                onClick={() => onNavigate(target)}
                type="button"
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{t[item.labelKey]}</span>
              </button>
            );
          })}
        </nav>

        <div className="account-box">
          <span className="account-avatar" aria-hidden="true">
            {(userEmail ?? 'GP').slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{userEmail ?? t.account}</strong>
            <small>Pathfinder</small>
          </div>
          <Button variant="ghost" onClick={onSignOut}>
            {t.signOut}
          </Button>
        </div>
      </aside>

      <section className="content-shell">{children}</section>
    </main>
  );
}
