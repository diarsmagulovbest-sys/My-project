import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import { AppLayout } from './components/layout/AppLayout';
import { CreateGoalForm } from './features/goals/CreateGoalForm';
import { GoalDetailMock } from './features/goals/GoalDetailMock';
import { GoalQuestionsPanel } from './features/goals/GoalQuestionsPanel';
import { createGoal, fetchGoals } from './features/goals/goalsApi';
import { GoalsDashboard } from './features/goals/GoalsDashboard';
import { RoadmapView } from './features/roadmap/RoadmapView';
import { supabase } from './lib/supabase';
import type { CreateGoalInput, Goal } from './types/goal';

type AppPage = 'dashboard' | 'create' | 'detail';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [roadmapRefreshKey, setRoadmapRefreshKey] = useState(0);

  const loadGoals = useCallback(async (userId: string) => {
    setIsGoalsLoading(true);
    setGoalsError(null);

    try {
      const nextGoals = await fetchGoals(userId);
      setGoals(nextGoals);
      setSelectedGoalId((currentGoalId) => {
        if (nextGoals.some((goal) => goal.id === currentGoalId)) {
          return currentGoalId;
        }

        return nextGoals[0]?.id ?? '';
      });
    } catch (error) {
      setGoalsError(getErrorMessage(error));
    } finally {
      setIsGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsAuthLoading(false);

      if (data.session) {
        void loadGoals(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);

      if (!nextSession) {
        setGoals([]);
        setSelectedGoalId('');
        setActivePage('dashboard');
        return;
      }

      void loadGoals(nextSession.user.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadGoals]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const handleCreateGoal = async (input: CreateGoalInput) => {
    if (!session) {
      setCreateError('Нужно войти в аккаунт.');
      return;
    }

    setIsCreatingGoal(true);
    setCreateError(null);

    try {
      const newGoal = await createGoal(session.user.id, input);

      setGoals((currentGoals) => [newGoal, ...currentGoals]);
      setSelectedGoalId(newGoal.id);
      setActivePage('detail');
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreatingGoal(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="center-page">
        <p className="loading-text">Загрузка...</p>
      </main>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={(page) => {
        setCreateError(null);
        setActivePage(page);
      }}
      onSignOut={() => void supabase.auth.signOut()}
      userEmail={session.user.email}
    >
      {activePage === 'dashboard' ? (
        <GoalsDashboard
          error={goalsError}
          goals={goals}
          isLoading={isGoalsLoading}
          onCreateClick={() => {
            setCreateError(null);
            setActivePage('create');
          }}
          onOpenGoal={(goalId) => {
            setSelectedGoalId(goalId);
            setActivePage('detail');
          }}
        />
      ) : null}

      {activePage === 'create' ? (
        <CreateGoalForm
          error={createError}
          isSubmitting={isCreatingGoal}
          onCancel={() => {
            setCreateError(null);
            setActivePage('dashboard');
          }}
          onCreate={handleCreateGoal}
        />
      ) : null}

      {activePage === 'detail' && selectedGoal ? (
        <GoalDetailMock
          goal={selectedGoal}
          onBack={() => setActivePage('dashboard')}
          questionsPanel={
            <GoalQuestionsPanel
              goal={selectedGoal}
              key={selectedGoal.id}
              onAnswersSaved={() => setRoadmapRefreshKey((currentKey) => currentKey + 1)}
            />
          }
          roadmapPanel={
            <RoadmapView
              goal={selectedGoal}
              key={`${selectedGoal.id}-${roadmapRefreshKey}`}
              onGoalProgressChange={(progress, status) => {
                setGoals((currentGoals) =>
                  currentGoals.map((goal) =>
                    goal.id === selectedGoal.id ? { ...goal, progress, status } : goal,
                  ),
                );
              }}
            />
          }
        />
      ) : null}

      {activePage === 'detail' && !selectedGoal ? (
        <section className="state-panel">
          <h2>Цель не найдена</h2>
          <p>Возможно, она была удалена или недоступна текущему пользователю.</p>
        </section>
      ) : null}
    </AppLayout>
  );
}
