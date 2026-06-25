import type { ElementType, ReactNode } from 'react';
import {
  CalendarIcon,
  GearIcon,
  TargetIcon,
} from '@radix-ui/react-icons';
import type { AppNavTarget, AppPage } from '../../types/navigation';
import { useLanguage } from '../../lib/language';
import { playNavigationClickSound } from '../../lib/navClickSound';

type AppLayoutProps = {
  activePage: AppPage;
  children: ReactNode;
  onNavigate: (target: AppNavTarget) => void;
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
  id: 'today' | 'goals' | 'roadmap' | 'settings';
  labelKey:
    | 'navToday'
    | 'navGoals'
    | 'navRoadmap'
    | 'navSettings';
  Icon: ElementType;
  target: AppNavTarget;
}> = [
  { id: 'today', labelKey: 'navToday', Icon: CalendarIcon, target: { page: 'today' } },
  { id: 'goals', labelKey: 'navGoals', Icon: TargetIcon, target: { page: 'goals' } },
  { id: 'roadmap', labelKey: 'navRoadmap', Icon: RoadmapPathIcon, target: { page: 'roadmap' } },
  { id: 'settings', labelKey: 'navSettings', Icon: GearIcon, target: { page: 'settings' } },
];

function isActiveNavItem(item: (typeof navItems)[number], activePage: AppPage) {
  if (item.id === 'goals' && ['create', 'customize', 'detail'].includes(activePage)) {
    return true;
  }

  if (item.id === 'settings' && activePage === 'secret') {
    return true;
  }

  return item.target.page === activePage;
}

export function AppLayout({ activePage, children, onNavigate }: AppLayoutProps) {
  const { t } = useLanguage();
  const shellClassName = `app-shell app-shell--phone app-shell--page-${activePage} app-shell--landing-auth`;

  if (activePage === 'customize') {
    return <main className="app-shell app-shell--customize-standalone app-shell--landing-auth">{children}</main>;
  }

  return (
    <main className={shellClassName}>
      <div className="app-phone-stage">
        <div className="app-phone-device">
          <div className="app-phone-notch" aria-hidden="true" />
          <div className="app-phone-screen">
            <section className="content-shell app-phone-content">{children}</section>
            <nav className="app-phone-tabbar" aria-label={t.mainNavigation} data-tour="main-nav">
              {navItems.map((item) => {
                const Icon = item.Icon;
                const isActive = isActiveNavItem(item, activePage);

                return (
                  <button
                    aria-current={isActive ? 'page' : undefined}
                    className={isActive ? 'app-phone-tab app-phone-tab-active' : 'app-phone-tab'}
                    data-tour={`nav-${item.id}`}
                    key={item.id}
                    onClick={() => {
                      playNavigationClickSound(item.id);
                      onNavigate(item.target);
                    }}
                    type="button"
                  >
                    <Icon aria-hidden="true" />
                    <span>{t[item.labelKey]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
}
