import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage, type AppLanguage } from '../../lib/language';
import type { GoalSummary } from '../../types/goal';
import type { DetailSectionId } from '../../types/navigation';
import { getMentorProfile, type MentorProfileId } from '../mentor/mentorProfiles';
import { MentorChat } from '../mentor/MentorChat';
import { PlanAdaptationPanel } from '../mentor/PlanAdaptationPanel';

type TaskStatus = 'todo' | 'completed';

type GoalTask = {
  description: string;
  estimatedMinutes: number;
  id: string;
  status: TaskStatus;
  title: string;
};

type GoalStage = {
  description: string;
  id: string;
  status: 'active' | 'locked' | 'completed';
  tasks: GoalTask[];
  title: string;
};

type GoalDetailMockProps = {
  activeSection?: DetailSectionId | null;
  canDeleteGoal?: boolean;
  deletingGoalId?: string | null;
  goal: GoalSummary & {
    stages?: GoalStage[];
  };
  onBack: () => void;
  onDeleteGoal?: (goalId: string) => void;
  questionsPanel?: ReactNode;
  roadmapPanel?: ReactNode;
};

type CollapsibleGoalSectionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  eyebrow?: string;
  forceOpen?: boolean;
  summary?: string;
  title: string;
};

const mentorProfileDisplayRu: Record<MentorProfileId, { description: string; label: string }> = {
  business_project: {
    description: 'Помогает проверять идеи, планировать маленький проект и готовить презентацию.',
    label: 'Наставник по проектам',
  },
  creative_skill: {
    description: 'Помогает учиться через маленькие творческие работы, обратную связь и доработку.',
    label: 'Творческий наставник',
  },
  fitness: {
    description: 'Помогает двигаться постепенно, безопасно и с учётом восстановления.',
    label: 'Фитнес-наставник',
  },
  general: {
    description: 'Помогает двигаться к цели маленькими реалистичными шагами.',
    label: 'Универсальный наставник',
  },
  language_learning: {
    description: 'Помогает тренировать речь, аудирование, словарь, грамматику и практику.',
    label: 'Наставник по языкам',
  },
  martial_arts: {
    description: 'Помогает тренироваться безопасно: техника, разминка, контроль и тренер.',
    label: 'Наставник по единоборствам',
  },
  music: {
    description: 'Помогает строить короткие практики, технику, повторение и музыкальные привычки.',
    label: 'Музыкальный наставник',
  },
  programming: {
    description: 'Помогает учиться через проекты, код, инструменты и отладку.',
    label: 'Наставник по программированию',
  },
  puzzle_logic: {
    description: 'Помогает учить методы, паттерны, алгоритмы и спокойную практику.',
    label: 'Наставник по головоломкам',
  },
  school_exam: {
    description: 'Помогает разбирать темы, слабые места, повторение и тренировочные задания.',
    label: 'Наставник по учёбе',
  },
};

function formatDate(value: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
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
  onDeleteGoal,
  questionsPanel,
  roadmapPanel,
}: GoalDetailMockProps) {
  const { language, t } = useLanguage();
  const mentorRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const roadmapRef = useRef<HTMLDivElement | null>(null);
  const tasksRef = useRef<HTMLDivElement | null>(null);
  const stages = goal.stages ?? [];
  const allTasks = stages.flatMap((stage) => stage.tasks);
  const currentTask = allTasks.find((task) => task.status !== 'completed') ?? allTasks[0];
  const completedTasks = allTasks.filter((task) => task.status === 'completed');
  const mentorProfile = getMentorProfile(goal.mentorProfileId);
  const mentorProfileCopy =
    language === 'ru'
      ? mentorProfileDisplayRu[mentorProfile.mentorProfileId]
      : { description: mentorProfile.description, label: mentorProfile.label };
  const aiAnalysis = goal.aiAnalysis;
  const todayTitle = currentTask?.title ?? aiAnalysis?.firstSmallAction ?? t.createRoadmap;
  const todayDescription =
    currentTask?.description ??
    (aiAnalysis ? t.smallestActionToday : t.unlockingTasksDescription);

  useEffect(() => {
    const sectionRefs: Partial<Record<DetailSectionId, HTMLElement | HTMLDivElement | null>> = {
      mentor: mentorRef.current,
      progress: progressRef.current,
      roadmap: roadmapRef.current,
      tasks: tasksRef.current,
    };
    const element = activeSection ? sectionRefs[activeSection] : null;

    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSection, goal.id]);

  return (
    <div className="page-stack">
      <header className="detail-header">
        <div className="detail-actions">
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
        <div>
          <span className="eyebrow">{t.goalPage}</span>
          <h1>{goal.title}</h1>
          <p>{goal.description || t.refineDescription}</p>
        </div>
      </header>

      <section className="mentor-profile-card" aria-label={t.selectedMentor}>
        <div>
          <span className="eyebrow">{t.selectedMentor}</span>
          <strong>{mentorProfileCopy.label}</strong>
          <p>{mentorProfileCopy.description}</p>
        </div>
        <small>{t.mentorShapes}</small>
      </section>

      <div ref={tasksRef}>
        <CollapsibleGoalSection
          defaultOpen
          eyebrow={t.today}
          forceOpen={activeSection === 'tasks'}
          summary={todayTitle}
          title={t.todaysNextStep}
        >
          <section className="task-focus task-focus-primary">
            <div>
              <span className="eyebrow">{t.doThisNext}</span>
              <h2>{todayTitle}</h2>
              <p>{todayDescription}</p>
            </div>
            <Button disabled={!currentTask || currentTask.status === 'completed'}>
              {t.markDone}
            </Button>
          </section>
        </CollapsibleGoalSection>
      </div>

      <div className="detail-section-anchor" ref={mentorRef}>
        <CollapsibleGoalSection
          defaultOpen
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

          {questionsPanel}

          <MentorChat goal={goal} key={goal.id} />

          <PlanAdaptationPanel goal={goal} key={`adapt-${goal.id}`} />
        </CollapsibleGoalSection>
      </div>

      <div className="detail-section-anchor" ref={roadmapRef}>
        <CollapsibleGoalSection
          eyebrow={t.plan}
          forceOpen={activeSection === 'roadmap'}
          summary={stages.length > 0 ? `${stages.length} ${t.loadingStages}` : t.createRoadmap}
          title={t.roadmap}
        >
          {roadmapPanel ??
            (stages.length > 0 ? (
              <section className="roadmap-grid" aria-label={t.roadmap}>
                {stages.map((stage, index) => (
                  <article className="stage-panel" key={stage.id}>
                    <div className="stage-heading">
                      <span>{language === 'ru' ? `Этап ${index + 1}` : `Stage ${index + 1}`}</span>
                      <strong>{stage.title}</strong>
                      <p>{stage.description}</p>
                    </div>
                    <div className="task-list">
                      {stage.tasks.map((task) => (
                        <div className="task-row" key={task.id}>
                          <span className={task.status === 'completed' ? 'task-check task-done' : 'task-check'} />
                          <div>
                            <strong>{task.title}</strong>
                            <small>{task.estimatedMinutes} {t.min}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="state-panel">
                <h2>{t.noRoadmapYet}</h2>
                <p>{t.roadmapAfterQuestions}</p>
              </section>
            ))}
        </CollapsibleGoalSection>
      </div>

      <div ref={progressRef}>
        <CollapsibleGoalSection
          eyebrow={t.summary ?? 'Summary'}
          forceOpen={activeSection === 'progress'}
          summary={`${goal.progress}% ${t.progress}`}
          title={t.goalInfo}
        >
          <section className="detail-summary" aria-label={t.goalInfo}>
            <div>
              <span>{t.target}</span>
              <strong>{formatDate(goal.targetDate, language)}</strong>
            </div>
            <div>
              <span>{t.time}</span>
              <strong>
                {goal.availableTime} {t.min} {goal.timePeriod === 'day' ? t.perDay : t.perWeek}
              </strong>
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
        </CollapsibleGoalSection>
      </div>

      <CollapsibleGoalSection
        eyebrow={t.history}
        summary={
          language === 'ru'
            ? `${completedTasks.length} из ${allTasks.length} задач выполнено`
            : `${completedTasks.length} of ${allTasks.length} tasks done`
        }
        title={t.historyActions}
      >
        <section className="history-panel">
          <div>
            <h2>{t.progressHistory}</h2>
            <p>
              {t.completedTasks}: <strong>{completedTasks.length}</strong>{' '}
              {language === 'ru' ? 'из' : 'of'} <strong>{allTasks.length}</strong>
            </p>
          </div>
          <div className="locked-actions">
            <Button disabled variant="secondary">
              {t.askForHelp}
            </Button>
            <Button disabled variant="secondary">
              {t.changePlan}
            </Button>
          </div>
        </section>
      </CollapsibleGoalSection>
    </div>
  );
}
