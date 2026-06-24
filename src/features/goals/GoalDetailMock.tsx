import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../lib/language';
import type { GoalStatus, GoalSummary } from '../../types/goal';
import type { DetailSectionId } from '../../types/navigation';
import { MentorChat } from '../mentor/MentorChat';
import { PlanAdaptationPanel } from '../mentor/PlanAdaptationPanel';
import {
  getMentorCharacter,
  getMentorCharacterLine,
} from '../mentor/mentorCharacters';
import { getMentorProfile } from '../mentor/mentorProfiles';
import { useActiveMentorCharacterId } from '../mentor/useActiveMentorCharacterId';

type GoalDetailMockProps = {
  activeSection?: DetailSectionId | null;
  canDeleteGoal?: boolean;
  deletingGoalId?: string | null;
  goal: GoalSummary;
  onBack: () => void;
  onCompleteTask?: (taskId: string) => Promise<void> | void;
  onOpenCustomize?: () => void;
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getStatusLabel(status: GoalStatus, t: ReturnType<typeof useLanguage>['t']) {
  const labels: Record<GoalStatus, string> = {
    active: t.active,
    archived: t.archived,
    completed: t.completed,
    draft: t.draft,
    paused: t.paused,
  };

  return labels[status];
}

type GoalPreviewStep = {
  description?: string;
  label?: string;
  status: 'completed' | 'active' | 'locked';
  title: string;
};

function getShortText(value: string, maxLength = 96) {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trimEnd()}...`;
}

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
  onOpenCustomize,
  onOpenRoadmap,
  questionsPanel,
}: GoalDetailMockProps) {
  const { t } = useLanguage();
  const mentorRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLElement | null>(null);
  const tasksRef = useRef<HTMLElement | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const mentorProfile = getMentorProfile(goal.mentorProfileId);
  const activeMentorCharacterId = useActiveMentorCharacterId();
  const mentorCharacter = getMentorCharacter(activeMentorCharacterId);
  const aiAnalysis = goal.aiAnalysis;
  const currentTaskId = goal.todayTask?.id ?? null;
  const todayTitle = goal.todayTask?.title ?? aiAnalysis?.firstSmallAction ?? t.createRoadmap;
  const todayDescription = goal.todayTask
    ? getMentorCharacterLine(activeMentorCharacterId, 'goalNextStep')
    : aiAnalysis?.goalSummary ?? t.unlockingTasksDescription;
  const mentorDescription = getMentorCharacterLine(activeMentorCharacterId, 'goalMentor');
  const roadmapPreviewSteps: GoalPreviewStep[] = [
    {
      description: goal.progress > 0 ? undefined : getShortText(goal.description || t.savedGoalDescription, 72),
      label: goal.progress > 0 ? t.completed : undefined,
      status: goal.progress > 0 ? 'completed' : 'active',
      title: goal.progress > 0 ? t.startedMoving : t.firstDirection,
    },
    {
      description: getShortText(todayTitle, 72),
      label: t.today,
      status: goal.progress > 0 ? 'active' : 'locked',
      title: goal.todayTask ? t.todaysNextStep : t.createRoadmap,
    },
    {
      description: aiAnalysis?.steps[1] ? getShortText(aiAnalysis.steps[1], 72) : undefined,
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
          <div className="goal-work-lane">
            <section className="task-focus task-focus-primary" ref={tasksRef}>
              <div>
                <span className="eyebrow">{t.doThisNext}</span>
                <h2>{todayTitle}</h2>
                <p>{todayDescription}</p>
              </div>
              {taskError ? <p className="form-error">{taskError}</p> : null}
              <div className="task-focus-actions">
                <Button onClick={onOpenCustomize}>
                  {t.customizeMyGoals}
                </Button>
                <Button
                  disabled={!currentTaskId || isCompletingTask}
                  onClick={() => void handleCompleteTask()}
                  variant="secondary"
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
                  <span className="eyebrow">{t.roadmap}</span>
                  <h2>{t.roadmapPreview}</h2>
                </div>
                {onOpenRoadmap ? (
                  <Button variant="secondary" onClick={onOpenRoadmap}>
                    {t.openRoadmap}
                  </Button>
                ) : null}
              </div>
              <div className="goal-preview-timeline" aria-label={t.roadmap}>
                {roadmapPreviewSteps.map((step) => (
                  <div className={`goal-preview-step goal-preview-step-${step.status}`} key={step.title}>
                    <span aria-hidden="true" />
                    <div>
                      {step.label ? <small>{step.label}</small> : null}
                      <strong>{step.title}</strong>
                      {step.description ? <p>{step.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

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
              <strong>{mentorCharacter.name}</strong>
              <p>{mentorDescription}</p>
            </div>
            <small>{mentorProfile.label}</small>
          </section>

          <section className="detail-summary" aria-label={t.goalInfo} ref={progressRef}>
            <div>
              <span>{t.status}</span>
              <strong>{getStatusLabel(goal.status, t)}</strong>
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
