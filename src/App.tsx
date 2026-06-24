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
import { LandingPage } from './features/landing/LandingPage';
import { classifyGoalMentorProfile } from './features/mentor/classifyGoalMentorProfile';
import { MentorCharactersPage } from './features/mentor/MentorCharactersPage';
import { getDefaultMentorProfile } from './features/mentor/mentorProfiles';
import { AchievementsPage } from './features/navigation/AchievementsPage';
import { SecretPage } from './features/navigation/SecretPage';
import { SettingsPage } from './features/navigation/SettingsPage';
import { RoadmapView } from './features/roadmap/RoadmapView';
import { setRoadmapTaskCompletion } from './features/roadmap/roadmapApi';
import { useLanguage } from './lib/language';
import { supabase } from './lib/supabase';
import type { CreateGoalInput, GoalSummary } from './types/goal';
import type { AppNavTarget, AppPage, DetailSectionId } from './types/navigation';

const detailSectionByPage: Partial<Record<AppPage, DetailSectionId>> = {
  mentor: 'mentor',
  progress: 'progress',
  tasks: 'tasks',
};

type RouteState = {
  page: AppPage;
  selectedGoalId?: string;
};

function getRouteState(pathname: string): RouteState {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const goalMatch = cleanPath.match(/^\/goals\/([^/]+)$/);

  if (goalMatch && goalMatch[1] !== 'new') {
    return { page: 'detail', selectedGoalId: decodeURIComponent(goalMatch[1]) };
  }

  const routeByPath: Record<string, AppPage> = {
    '/': 'today',
    '/achievements': 'achievements',
    '/goals': 'goals',
    '/goals/new': 'create',
    '/mentor': 'mentor',
    '/mentors': 'mentorCharacters',
    '/progress': 'progress',
    '/roadmap': 'roadmap',
    '/secret': 'secret',
    '/settings': 'settings',
    '/tasks': 'tasks',
    '/today': 'today',
  };

  return { page: routeByPath[cleanPath] ?? 'today' };
}

function getPathForPage(page: AppPage, selectedGoalId = '') {
  const pathByPage: Record<AppPage, string> = {
    achievements: '/achievements',
    create: '/goals/new',
    detail: selectedGoalId ? `/goals/${encodeURIComponent(selectedGoalId)}` : '/goals',
    goals: '/goals',
    mentor: '/mentor',
    mentorCharacters: '/mentors',
    progress: '/progress',
    roadmap: '/roadmap',
    secret: '/secret',
    settings: '/settings',
    tasks: '/tasks',
    today: '/today',
  };

  return pathByPage[page];
}

function pushRoute(page: AppPage, selectedGoalId = '') {
  const nextPath = getPathForPage(page, selectedGoalId);
  const nextState: RouteState = {
    page,
    selectedGoalId: selectedGoalId || undefined,
  };

  if (window.location.pathname !== nextPath) {
    window.history.pushState(nextState, '', nextPath);
    return;
  }

  window.history.replaceState(nextState, '', nextPath);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function getSafeMentorProfileId(input: CreateGoalInput) {
  try {
    const classification = await classifyGoalMentorProfile(input);

    return classification.mentorProfileId;
  } catch {
    // Mentor choice improves personalization, but goal creation should still work if AI fails.
    return getDefaultMentorProfile().mentorProfileId;
  }
}

export default function App() {
  const { language, t } = useLanguage();
  const initialRoute = useMemo(() => getRouteState(window.location.pathname), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>(initialRoute.page);
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialRoute.selectedGoalId ?? '');
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [roadmapRefreshKey, setRoadmapRefreshKey] = useState(0);
  const latestGoalsLoadIdRef = useRef(0);

  const loadGoals = useCallback(async (userId: string) => {
    // Only the newest load may update state, so slower auth/navigation requests cannot overwrite it.
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
        pushRoute('today');
        return;
      }

      void loadGoals(nextSession.user.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadGoals]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const nextRoute = getRouteState(window.location.pathname);
      const nextState = event.state as Partial<RouteState> | null;
      const nextSelectedGoalId = nextRoute.selectedGoalId ?? nextState?.selectedGoalId;

      setActivePage(nextRoute.page);

      if (nextSelectedGoalId) {
        setSelectedGoalId(nextSelectedGoalId);
      }
    };

    window.history.replaceState(
      {
        page: initialRoute.page,
        selectedGoalId: initialRoute.selectedGoalId || undefined,
      } satisfies RouteState,
      '',
      window.location.pathname,
    );
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialRoute.page, initialRoute.selectedGoalId]);

  const goToPage = useCallback((page: AppPage, nextSelectedGoalId = selectedGoalId) => {
    setActivePage(page);
    if (nextSelectedGoalId) {
      setSelectedGoalId(nextSelectedGoalId);
    }
    pushRoute(page, nextSelectedGoalId);
  }, [selectedGoalId]);

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
  const isRoadmapPage = activePage === 'roadmap';
  const selectedRoadmapGoal = isRoadmapPage ? selectedGoal ?? goals[0] ?? null : null;

  const handleNavigate = (target: AppNavTarget) => {
    setCreateError(null);

    if (target.page === 'roadmap') {
      const goalId = selectedGoalId || goals[0]?.id;

      if (goalId) {
        setSelectedGoalId(goalId);
      }

      goToPage('roadmap', goalId);
      return;
    }

    if (detailSectionByPage[target.page]) {
      const goalId = selectedGoalId || goals[0]?.id;

      if (goalId) {
        setSelectedGoalId(goalId);
      }

      goToPage(target.page, goalId);
      return;
    }

    goToPage(target.page);
  };

  const handleCreateGoal = async (input: CreateGoalInput) => {
    if (!session) {
      setCreateError(t.signInRequired);
      return;
    }

    if (isGoalLimitReached) {
      setCreateError(t.createGoalLimitReachedDescription(maxGoalsPerUser));
      goToPage('create');
      return;
    }

    setIsCreatingGoal(true);
    setCreateError(null);
    // Creating a goal changes the local list directly; invalidate any older fetch still in flight.
    latestGoalsLoadIdRef.current += 1;

    try {
      // Classification can run beside analysis because both depend only on the form input.
      const mentorProfileIdPromise = getSafeMentorProfileId(input);
      const aiAnalysis = await generateGoalAnalysis(input, language);
      const mentorProfileId = await mentorProfileIdPromise;
      const newGoal = await createGoal(session.user.id, input, aiAnalysis, mentorProfileId);

      setGoals((currentGoals) => [newGoal, ...currentGoals]);
      setSelectedGoalId(newGoal.id);
      goToPage('detail', newGoal.id);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleCompleteCurrentTask = async (goalId: string, taskId: string) => {
    if (!session) {
      throw new Error(t.signInRequired);
    }

    const result = await setRoadmapTaskCompletion(goalId, taskId, true);

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: result.goalProgress,
              status: result.goalStatus,
              todayTask: goal.todayTask?.id === taskId ? undefined : goal.todayTask,
            }
          : goal,
      ),
    );
    setRoadmapRefreshKey((currentKey) => currentKey + 1);
    void loadGoals(session.user.id);
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
        goToPage('goals', '');
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
        <p className="loading-text">{t.loading}</p>
      </main>
    );
  }

  if (!session) {
    return isAuthVisible ? (
      <Auth onBackToLanding={() => setIsAuthVisible(false)} />
    ) : (
      <LandingPage onGetStarted={() => setIsAuthVisible(true)} />
    );
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
          view={activePage === 'goals' ? 'goals' : 'today'}
          onCreateClick={() => {
            setCreateError(null);
            goToPage('create');
          }}
          onOpenGoal={(goalId) => {
            setSelectedGoalId(goalId);
            goToPage('detail', goalId);
          }}
          onOpenGoals={() => goToPage('goals')}
          onOpenSettings={() => goToPage('settings')}
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
            goToPage('goals');
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
            goToPage('goals');
          }}
          onDeleteGoal={(goalId) => void handleDeleteGoal(goalId)}
          onOpenRoadmap={() => goToPage('roadmap')}
          onCompleteTask={(taskId) => handleCompleteCurrentTask(selectedGoal.id, taskId)}
          questionsPanel={
            <GoalQuestionsPanel
              goal={selectedGoal}
              key={selectedGoal.id}
              onAnswersSaved={(options) => {
                setRoadmapRefreshKey((currentKey) => currentKey + 1);

                if (options?.openRoadmap) {
                  goToPage('roadmap');
                }
              }}
            />
          }
        />
      ) : null}

      {isRoadmapPage && selectedRoadmapGoal ? (
        <RoadmapView
          goal={selectedRoadmapGoal}
          key={`${selectedRoadmapGoal.id}-${roadmapRefreshKey}`}
          onBackToGoal={() => {
            setSelectedGoalId(selectedRoadmapGoal.id);
            goToPage('detail', selectedRoadmapGoal.id);
          }}
          onGoalProgressChange={(progress, status) => {
            setGoals((currentGoals) =>
              currentGoals.map((goal) =>
                goal.id === selectedRoadmapGoal.id ? { ...goal, progress, status } : goal,
              ),
            );
          }}
        />
      ) : null}

      {isRoadmapPage && !selectedRoadmapGoal && isGoalsLoading ? (
        <section className="state-panel" aria-live="polite">
          <h2>{t.loadingGoals}</h2>
          <p>{t.loadingGoalsDescription}</p>
        </section>
      ) : null}

      {isGoalSectionPage && !selectedGoal ? (
        <section className="state-panel">
          <h2>{t.noGoalSelected}</h2>
          <p>{t.noGoalSelectedDescription}</p>
          <Button onClick={() => goToPage('create')}>{t.createGoal}</Button>
        </section>
      ) : null}

      {isRoadmapPage && !selectedRoadmapGoal && !isGoalsLoading ? (
        <section className="state-panel">
          <h2>{t.noGoalSelected}</h2>
          <p>{t.noGoalSelectedDescription}</p>
          <Button onClick={() => goToPage('create')}>{t.createGoal}</Button>
        </section>
      ) : null}

      {activePage === 'achievements' ? (
        <AchievementsPage
          goals={goals}
          onCreateGoal={() => goToPage('create')}
          onOpenGoals={() => goToPage('goals')}
        />
      ) : null}

      {activePage === 'mentorCharacters' ? <MentorCharactersPage /> : null}

      {activePage === 'settings' ? (
        <SettingsPage
          canDeleteGoals={canDeleteGoals}
          isGoalLimitEnabled={isGoalLimitEnabled}
          maxGoals={maxGoalsPerUser}
          onOpenSecret={() => goToPage('secret')}
          userEmail={session.user.email}
        />
      ) : null}

      {activePage === 'secret' ? <SecretPage /> : null}

      {activePage === 'detail' && !selectedGoal ? (
        <section className="state-panel">
          <h2>{t.noGoalFound}</h2>
          <p>{t.noGoalFoundDescription}</p>
        </section>
      ) : null}
    </AppLayout>
  );
}
