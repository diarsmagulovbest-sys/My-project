import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppPage } from '../../types/navigation';

type TeachingStep = {
  body: string;
  page: AppPage;
  selector: string;
  title: string;
};

type SpotlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type TeachingOverlayProps = {
  activePage: AppPage;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: AppPage) => void;
  onStartGoal: () => void;
};

const teachingSteps: TeachingStep[] = [
  {
    body: 'Tap this to tell the mentor what you want. GoalPath will turn it into a clear plan.',
    page: 'today',
    selector: '[data-tour="create-goal"]',
    title: 'Start with one goal',
  },
  {
    body: 'After your roadmap is ready, your daily tasks and XP live here so you always know the next move.',
    page: 'today',
    selector: '[data-tour="today-board"]',
    title: 'Win today',
  },
  {
    body: 'Your goals tab keeps every learning world in one place: progress, details, and next tasks.',
    page: 'today',
    selector: '[data-tour="nav-goals"]',
    title: 'Open your goals',
  },
  {
    body: 'Roadmap shows the full path from first step to finish line, with tasks you can complete.',
    page: 'today',
    selector: '[data-tour="nav-roadmap"]',
    title: 'Follow the roadmap',
  },
  {
    body: 'Settings is where theme, language, and account controls live.',
    page: 'today',
    selector: '[data-tour="nav-settings"]',
    title: 'Make it yours',
  },
];

function getSpotlightRect(selector: string): SpotlightRect | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const element = elements.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const style = window.getComputedStyle(candidate);

    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const padding = 10;

  return {
    height: rect.height + padding * 2,
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2,
  };
}

export function TeachingOverlay({
  activePage,
  isOpen,
  onClose,
  onNavigate,
  onStartGoal,
}: TeachingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const step = teachingSteps[stepIndex];
  const isLastStep = stepIndex === teachingSteps.length - 1;
  const titleId = 'teaching-overlay-title';
  const descriptionId = 'teaching-overlay-description';

  const updateSpotlight = useCallback(() => {
    if (!isOpen) {
      return;
    }

    setSpotlightRect(getSpotlightRect(step.selector));
  }, [isOpen, step.selector]);

  useEffect(() => {
    if (!isOpen || activePage === step.page) {
      return;
    }

    onNavigate(step.page);
  }, [activePage, isOpen, onNavigate, step.page]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frameId = window.requestAnimationFrame(updateSpotlight);
    cardRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
      previousFocus?.focus();
    };
  }, [isOpen, onClose, updateSpotlight]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setSpotlightRect(null);
    }
  }, [isOpen]);

  const panelStyle = useMemo(() => {
    const panelWidth = Math.min(360, window.innerWidth - 32);

    if (!spotlightRect) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: panelWidth,
      };
    }

    const enoughRoomBelow = spotlightRect.top + spotlightRect.height + 190 < window.innerHeight;
    const top = enoughRoomBelow
      ? spotlightRect.top + spotlightRect.height + 18
      : Math.max(16, spotlightRect.top - 218);
    const left = Math.min(
      Math.max(16, spotlightRect.left + spotlightRect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - 16,
    );

    return {
      left,
      top,
      width: panelWidth,
    };
  }, [spotlightRect]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="teaching-overlay" aria-live="polite">
      <div
        className="teaching-spotlight"
        style={
          spotlightRect
            ? {
                height: spotlightRect.height,
                left: spotlightRect.left,
                top: spotlightRect.top,
                width: spotlightRect.width,
              }
            : undefined
        }
      />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="teaching-card"
        ref={cardRef}
        role="dialog"
        style={panelStyle}
        tabIndex={-1}
      >
        <div className="teaching-card-top">
          <span>
            {stepIndex + 1}/{teachingSteps.length}
          </span>
          <button className="teaching-skip" onClick={onClose} type="button">
            Skip
          </button>
        </div>
        <h2 id={titleId}>{step.title}</h2>
        <p id={descriptionId}>{step.body}</p>
        <div className="teaching-progress" aria-hidden="true">
          {teachingSteps.map((item, index) => (
            <span
              className={index <= stepIndex ? 'teaching-progress-dot teaching-progress-dot-active' : 'teaching-progress-dot'}
              key={item.title}
            />
          ))}
        </div>
        <div className="teaching-actions">
          <button
            className="teaching-secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((currentIndex) => Math.max(0, currentIndex - 1))}
            type="button"
          >
            Back
          </button>
          {isLastStep ? (
            <button className="teaching-primary" onClick={onStartGoal} type="button">
              Create goal
            </button>
          ) : (
            <button
              className="teaching-primary"
              onClick={() => setStepIndex((currentIndex) => Math.min(teachingSteps.length - 1, currentIndex + 1))}
              type="button"
            >
              Next
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
