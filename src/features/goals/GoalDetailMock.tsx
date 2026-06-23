import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage, type AppLanguage } from '../../lib/language';
import type { GoalSummary } from '../../types/goal';
import type { DetailSectionId } from '../../types/navigation';
import { MentorChat } from '../mentor/MentorChat';
import { PlanAdaptationPanel } from '../mentor/PlanAdaptationPanel';
import { getMentorProfile } from '../mentor/mentorProfiles';

type GoalDetailMockProps = {
  activeSection?: DetailSectionId | null;
  canDeleteGoal?: boolean;
  deletingGoalId?: string | null;
  goal: GoalSummary;
  onBack: () => void;
  onCompleteTask?: (taskId: string) => Promise<void> | void;
  onDeleteGoal?: (goalId: string) => void;
  onOpenRoadmap?: () => void;
  questionsPanel?: ReactNode;
};

type CollapsibleGoalSectionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  eyebrow?: string;
  forceOpen?: boolean;
  summary?: string;
  title: string;
};

function formatDate(value: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type GoalPreviewStep = {
  description: string;
  label: string;
  status: 'completed' | 'active' | 'locked';
  title: string;
};

function CollapsibleGoalSection({
  children,
  defaultOpen = false,
  eyebrow,
  forceOpen = false,
  summary,
  title,
}: CollapsibleGoalSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const visibleOpen = forceOpen || isOpen;

  return (
    <details className="goal-collapsible" open={visibleOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="goal-collapsible-summary">
        <span className="goal-collapsible-copy">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <strong>{title}</strong>
          {summary ? <small>{summary}</small> : null}
        </span>
        <span className="goal-collapsible-indicator" aria-hidden="true" />
      </summary>
      <div className="goal-collapsible-body">{children}</div>
    </details>
  );
}

export function GoalDetailMock({
  activeSection = null,
  canDeleteGoal = false,
  deletingGoalId = null,
  goal,
  onBack,
  onCompleteTask,
  onDeleteGoal,
  onOpenRoadmap,
  questionsPanel,
}: GoalDetailMockProps) {
  const { language, t } = useLanguage();
  const mentorRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLElement | null>(null);
  const tasksRef = useRef<HTMLElement | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const mentorProfile = getMentorProfile(goal.mentorProfileId);
  const aiAnalysis = goal.aiAnalysis;
  const currentTaskId = goal.todayTask?.id ?? null;
  const todayTitle = goal.todayTask?.title ?? aiAnalysis?.firstSmallAction ?? t.createRoadmap;
  const todayDescription = goal.todayTask
    ? t.smallestActionToday
    : aiAnalysis?.goalSummary ?? t.unlockingTasksDescription;
  const availableTimeLabel = `${goal.availableTime} ${t.min} ${
    goal.timePeriod === 'day' ? t.perDay : t.perWeek
  }`;
  const roadmapPreviewSteps: GoalPreviewStep[] = [
    {
      description: goal.progress > 0 ? t.startedMovingText : goal.description || t.savedGoalDescription,
      label: goal.progress > 0 ? t.completed : t.unlocked,
      status: goal.progress > 0 ? 'completed' : 'active',
      title: goal.progress > 0 ? t.startedMoving : t.firstDirection,
    },
    {
      description: todayDescription,
      label: t.today,
      status: goal.progress > 0 ? 'active' : 'locked',
      title: todayTitle,
    },
    {
      description: aiAnalysis?.steps[1] ?? t.roadmapAfterQuestions,
      label: t.locked,
      status: 'locked',
      title: t.thisWeek,
    },
  ];

  useEffect(() => {
    const sectionRefs: Partial<Record<DetailSectionId, HTMLElement | HTMLDivElement | null>> = {
      mentor: mentorRef.current,
      progress: progressRef.current,
      tasks: tasksRef.current,
    };
    const element = activeSection ? sectionRefs[activeSection] : null;

    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSection, goal.id]);

  const handleCompleteTask = async () => {
    if (!currentTaskId || isCompletingTask) {
      return;
    }

    setTaskError(null);
    setIsCompletingTask(true);

    try {
      await onCompleteTask?.(currentTaskId);
    } catch (error) {
      setTaskError(getErrorMessage(error, t.unknownError));
    } finally {
      setIsCompletingTask(false);
    }
  };

  return (
    <div className="page-stack goal-detail-stitch">
      <div className="goal-detail-grid">
        <main className="goal-detail-main">
          <section className="goal-command-card">
            <div className="goal-command-copy">
              <span className="eyebrow">{t.goalPage}</span>
              <h1>{goal.title}</h1>
              <p>{goal.description || t.refineDescription}</p>
            </div>
            <div className="goal-command-progress">
              <div className="progress-ring goal-command-ring" aria-label={`${t.progress} ${goal.progress}%`}>
                <span>{goal.progress}%</span>
              </div>
              <div className="goal-command-metrics">
                <div>
                  <span>{t.target}</span>
                  <strong>{formatDate(goal.targetDate, language)}</strong>
                </div>
                <div>
                  <span>{t.time}</span>
                  <strong>{availableTimeLabel}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="task-focus task-focus-primary" ref={tasksRef}>
            <div>
              <span className="eyebrow">{t.doThisNext}</span>
              <h2>{todayTitle}</h2>
              <p>{todayDescription}</p>
            </div>
            {taskError ? <p className="form-error">{taskError}</p> : null}
            <div className="task-focus-actions">
              <Button
                disabled={!currentTaskId || isCompletingTask}
                onClick={() => void handleCompleteTask()}
              >
                {isCompletingTask ? t.saving : t.markDone}
              </Button>
              <Button variant="secondary" onClick={onOpenRoadmap}>
                {t.roadmap}
              </Button>
            </div>
          </section>

          <section className="goal-roadmap-preview goal-roadmap-preview-command">
            <div className="goal-roadmap-preview-heading">
              <div>
                <span className="eyebrow">{t.plan}</span>
                <h2>{t.roadmap}</h2>
                <p>{goal.todayTask ? t.smallestActionToday : t.roadmapAfterQuestions}</p>
              </div>
              <Button variant="secondary" onClick={onOpenRoadmap}>
                {t.open}
              </Button>
            </div>
            <div className="goal-preview-timeline" aria-label={t.roadmap}>
              {roadmapPreviewSteps.map((step) => (
                <div className={`goal-preview-step goal-preview-step-${step.status}`} key={step.label}>
                  <span aria-hidden="true" />
                  <div>
                    <small>{step.label}</small>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <CollapsibleGoalSection
            eyebrow={t.goalDetails}
            summary={t.answersEnough}
            title={t.answerFewQuestions}
          >
            {questionsPanel}
          </CollapsibleGoalSection>

          <div className="detail-section-anchor" ref={mentorRef}>
            <CollapsibleGoalSection
              defaultOpen={activeSection === 'mentor'}
              eyebrow={t.aiMentor}
              forceOpen={activeSection === 'mentor'}
              summary={t.questionsStuckHelpChat}
              title={t.mentor}
            >
              {aiAnalysis ? (
                <section className="ai-analysis-panel" aria-label={t.starterPlan}>
                  <div>
                    <span className="eyebrow">{t.starterPlan}</span>
                    <h2>{t.firstDirection}</h2>
                    <p>{aiAnalysis.goalSummary}</p>
                  </div>
                  <div className="ai-analysis-grid">
                    <div>
                      <span>{t.level}</span>
                      <strong>{aiAnalysis.estimatedUserLevel}</strong>
                    </div>
                    <div>
                      <span>{t.today}</span>
                      <strong>{aiAnalysis.firstSmallAction}</strong>
                    </div>
                  </div>
                </section>
              ) : null}

              <MentorChat goal={goal} key={goal.id} />
              <PlanAdaptationPanel goal={goal} key={`adapt-${goal.id}`} />
            </CollapsibleGoalSection>
          </div>
        </main>

        <aside className="goal-detail-side">
          <div className="detail-actions goal-side-actions">
            <Button variant="ghost" onClick={onBack}>
              {t.back}
            </Button>
            {canDeleteGoal ? (
              <Button
                disabled={deletingGoalId === goal.id}
                onClick={() => onDeleteGoal?.(goal.id)}
                variant="danger"
              >
                {deletingGoalId === goal.id ? t.deleting : t.delete}
              </Button>
            ) : null}
          </div>

          <section className="mentor-profile-card" aria-label={t.selectedMentor}>
            <div>
              <span className="eyebrow">{t.selectedMentor}</span>
              <strong>{mentorProfile.label}</strong>
              <p>{mentorProfile.description}</p>
            </div>
            <small>{t.mentorShapes}</small>
          </section>

          <section className="goal-next-card" aria-label={t.todaysNextStep}>
            <span>{t.todaysNextStep}</span>
            <strong>{todayTitle}</strong>
            <p>{todayDescription}</p>
          </section>

          <section className="detail-summary" aria-label={t.goalInfo} ref={progressRef}>
            <div>
              <span>{t.target}</span>
              <strong>{formatDate(goal.targetDate, language)}</strong>
            </div>
            <div>
              <span>{t.time}</span>
              <strong>{availableTimeLabel}</strong>
            </div>
            <div>
              <span>{t.progress}</span>
              <strong>{goal.progress}%</strong>
            </div>
            <div>
              <span>{t.level}</span>
              <strong>{goal.currentLevel || t.notProvided}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
