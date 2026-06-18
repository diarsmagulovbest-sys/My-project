import type { ElementType, ReactNode } from 'react';
import {
  BarChartIcon,
  CheckCircledIcon,
  GearIcon,
  HomeIcon,
  ListBulletIcon,
  MagicWandIcon,
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

function MedalIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5.2 2.4h3.1l1.1 4.2H6.7L5.2 2.4Z" fill="currentColor" opacity="0.78" />
      <path d="M9.7 2.4h3.1l-1.5 4.2H8.6l1.1-4.2Z" fill="currentColor" opacity="0.56" />
      <circle cx="9" cy="10.6" r="4.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m9 8.1.7 1.4 1.6.2-1.1 1.1.2 1.6L9 11.7l-1.4.7.2-1.6-1.1-1.1 1.6-.2L9 8.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

const navItems: Array<{
  id: string;
  labelKey:
    | 'navToday'
    | 'navGoals'
    | 'navRoadmap'
    | 'navTasks'
    | 'navProgress'
    | 'navMentor'
    | 'navAchievements'
    | 'navSettings';
  Icon: ElementType;
  target: AppNavTarget;
}> = [
  { id: 'today', labelKey: 'navToday', Icon: HomeIcon, target: { page: 'today' } },
  { id: 'goals', labelKey: 'navGoals', Icon: CheckCircledIcon, target: { page: 'goals' } },
  { id: 'roadmap', labelKey: 'navRoadmap', Icon: RoadmapPathIcon, target: { page: 'roadmap' } },
  { id: 'tasks', labelKey: 'navTasks', Icon: ListBulletIcon, target: { page: 'tasks' } },
  { id: 'progress', labelKey: 'navProgress', Icon: BarChartIcon, target: { page: 'progress' } },
  { id: 'mentor', labelKey: 'navMentor', Icon: MagicWandIcon, target: { page: 'mentor' } },
  { id: 'achievements', labelKey: 'navAchievements', Icon: MedalIcon, target: { page: 'achievements' } },
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
            <span className="eyebrow">{t.aiMentor}</span>
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
          <span>{userEmail ?? t.account}</span>
          <Button variant="ghost" onClick={onSignOut}>
            {t.signOut}
          </Button>
        </div>
      </aside>

      <section className="content-shell">{children}</section>
    </main>
  );
}
