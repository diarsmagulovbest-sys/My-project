import type { ReactNode } from 'react';
import { Button } from '../common/Button';

type AppPage = 'dashboard' | 'create' | 'detail';

type AppLayoutProps = {
  activePage: AppPage;
  children: ReactNode;
  onNavigate: (page: 'dashboard' | 'create') => void;
  onSignOut: () => void;
  userEmail?: string;
};

const navItems: Array<{ id: 'dashboard' | 'create'; label: string }> = [
  { id: 'dashboard', label: 'Цели' },
  { id: 'create', label: 'Создать цель' },
];

export function AppLayout({
  activePage,
  children,
  onNavigate,
  onSignOut,
  userEmail,
}: AppLayoutProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <span className="eyebrow">AI наставник</span>
            <strong>GoalPath</strong>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={activePage === item.id ? 'nav-item nav-item-active' : 'nav-item'}
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="account-box">
          <span>{userEmail ?? 'Аккаунт'}</span>
          <Button variant="ghost" onClick={onSignOut}>
            Выйти
          </Button>
        </div>
      </aside>

      <section className="content-shell">{children}</section>
    </main>
  );
}
