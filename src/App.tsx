import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import { Button } from './components/common/Button';
import { AppLayout } from './components/layout/AppLayout';
import { CreateGoalForm } from './features/goals/CreateGoalForm';
import { GoalDetailMock } from './features/goals/GoalDetailMock';
import { GoalQuestionsPanel } from './features/goals/GoalQuestionsPanel';
import { generateGoalAnalysis } from './features/goals/generateGoalAnalysis';
import { goalLimitsConfig } from './features/goals/goalLimits';
import { createGoal, deleteGoal, fetchGoals } from './features/goals/goalsApi';
import { GoalsDashboard } from './features/goals/GoalsDashboard';
import { AchievementsPage } from './features/navigation/AchievementsPage';
import { SettingsPage } from './features/navigation/SettingsPage';
import { RoadmapView } from './features/roadmap/RoadmapView';
import { supabase } from './lib/supabase';
import type { CreateGoalInput, GoalSummary } from './types/goal';
import type { AppNavTarget, AppPage, DetailSectionId } from './types/navigation';

const detailSectionByPage: Partial<Record<AppPage, DetailSectionId>> = {
  mentor: 'mentor',
  progress: 'progress',
  roadmap: 'roadmap',
  tasks: 'tasks',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('today');
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [roadmapRefreshKey, setRoadmapRefreshKey] = useState(0);
  const latestGoalsLoadIdRef = useRef(0);

  const loadGoals = useCallback(async (userId: string) => {
    const loadId = latestGoalsLoadIdRef.current + 1;
    latestGoalsLoadIdRef.current = loadId;

    setIsGoalsLoading(true);
    setGoalsError(null);

    try {
      const nextGoals = await fetchGoals(userId);

      if (latestGoalsLoadIdRef.current !== loadId) {
        return;
      }

      setGoals(nextGoals);
      setSelectedGoalId((currentGoalId) => {
        if (nextGoals.some((goal) => goal.id === currentGoalId)) {
          return currentGoalId;
        }

        return nextGoals[0]?.id ?? '';
      });
    } catch (error) {
      if (latestGoalsLoadIdRef.current !== loadId) {
        return;
      }

      setGoalsError(getErrorMessage(error));
    } finally {
      if (latestGoalsLoadIdRef.current === loadId) {
        setIsGoalsLoading(false);
      }
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
        setActivePage('today');
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
  const isGoalLimitEnabled = goalLimitsConfig.isEnabled;
  const maxGoalsPerUser = goalLimitsConfig.maxGoalsPerUser;
  const canDeleteGoals = isGoalLimitEnabled && goalLimitsConfig.canDeleteGoals;
  const isGoalLimitReached = isGoalLimitEnabled && goals.length >= maxGoalsPerUser;
  const activeDetailSection = detailSectionByPage[activePage] ?? null;
  const isGoalSectionPage = activeDetailSection !== null;
  const isGoalsOverviewPage = activePage === 'today' || activePage === 'goals';

  const handleNavigate = (target: AppNavTarget) => {
    setCreateError(null);

    if (detailSectionByPage[target.page]) {
      const goalId = selectedGoalId || goals[0]?.id;

      if (goalId) {
        setSelectedGoalId(goalId);
      }

      setActivePage(target.page);
      return;
    }

    setActivePage(target.page);
  };

  const handleCreateGoal = async (input: CreateGoalInput) => {
    if (!session) {
      setCreateError('Нужно войти в аккаунт.');
      return;
    }

    if (isGoalLimitReached) {
      setCreateError(`Можно создать максимум ${maxGoalsPerUser} целей. Удали одну из текущих целей, чтобы создать новую.`);
      setActivePage('create');
      return;
    }

    setIsCreatingGoal(true);
    setCreateError(null);
    latestGoalsLoadIdRef.current += 1;

    try {
      const aiAnalysis = await generateGoalAnalysis(input);
      const newGoal = await createGoal(session.user.id, input, aiAnalysis);

      setGoals((currentGoals) => [newGoal, ...currentGoals]);
      setSelectedGoalId(newGoal.id);
      setActivePage('detail');
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!session || !canDeleteGoals || deletingGoalId) {
      return;
    }

    setDeletingGoalId(goalId);
    setGoalsError(null);

    try {
      await deleteGoal(session.user.id, goalId);
      setGoals((currentGoals) => currentGoals.filter((goal) => goal.id !== goalId));

      if (selectedGoalId === goalId) {
        setSelectedGoalId('');
        setActivePage('goals');
      }
    } catch (error) {
      setGoalsError(getErrorMessage(error));
    } finally {
      setDeletingGoalId(null);
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
      onNavigate={handleNavigate}
      onSignOut={() => void supabase.auth.signOut()}
      userEmail={session.user.email}
    >
      {isGoalsOverviewPage ? (
        <GoalsDashboard
          error={goalsError}
          canDeleteGoals={canDeleteGoals}
          deletingGoalId={deletingGoalId}
          goals={goals}
          isGoalLimitEnabled={isGoalLimitEnabled}
          isLoading={isGoalsLoading}
          maxGoals={maxGoalsPerUser}
          onCreateClick={() => {
            setCreateError(null);
            setActivePage('create');
          }}
          onOpenGoal={(goalId) => {
            setSelectedGoalId(goalId);
            setActivePage('detail');
          }}
          onDeleteGoal={(goalId) => void handleDeleteGoal(goalId)}
        />
      ) : null}

      {activePage === 'create' ? (
        <CreateGoalForm
          error={createError}
          goalCount={goals.length}
          isGoalLimitEnabled={isGoalLimitEnabled}
          isSubmitting={isCreatingGoal}
          maxGoals={maxGoalsPerUser}
          onCancel={() => {
            setCreateError(null);
            setActivePage('goals');
          }}
          onCreate={handleCreateGoal}
        />
      ) : null}

      {(activePage === 'detail' || isGoalSectionPage) && selectedGoal ? (
        <GoalDetailMock
          activeSection={activeDetailSection}
          canDeleteGoal={canDeleteGoals}
          deletingGoalId={deletingGoalId}
          goal={selectedGoal}
          onBack={() => {
            setActivePage('goals');
          }}
          onDeleteGoal={(goalId) => void handleDeleteGoal(goalId)}
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

      {isGoalSectionPage && !selectedGoal ? (
        <section className="state-panel">
          <h2>No goal selected</h2>
          <p>Create a goal first, then this sidebar tab will open the matching goal feature.</p>
          <Button onClick={() => setActivePage('create')}>Create goal</Button>
        </section>
      ) : null}

      {activePage === 'achievements' ? (
        <AchievementsPage
          goals={goals}
          onCreateGoal={() => setActivePage('create')}
          onOpenGoals={() => setActivePage('goals')}
        />
      ) : null}

      {activePage === 'settings' ? (
        <SettingsPage
          canDeleteGoals={canDeleteGoals}
          isGoalLimitEnabled={isGoalLimitEnabled}
          maxGoals={maxGoalsPerUser}
          onOpenGoals={() => setActivePage('goals')}
          onSignOut={() => void supabase.auth.signOut()}
          userEmail={session.user.email}
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
