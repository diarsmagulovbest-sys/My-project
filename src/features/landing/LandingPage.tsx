import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowRightIcon,
  BarChartIcon,
  CheckCircledIcon,
  LightningBoltIcon,
  MagicWandIcon,
  RocketIcon,
  TargetIcon,
} from '@radix-ui/react-icons';
import goalpathLogo from '../../assets/ui/goalpath-logo.svg';

type LandingPageProps = {
  onGetStarted: () => void;
};

type LandingSectionId = 'features' | 'roadmap' | 'faq';

const navLinks: Array<{ id: LandingSectionId; label: string }> = [
  { id: 'features', label: 'Features' },
  { id: 'roadmap', label: 'How it works' },
  { id: 'faq', label: 'FAQ' },
];

const featureCards = [
  {
    Icon: MagicWandIcon,
    eyebrow: 'AI planning',
    title: 'Turn a big goal into a first clear move',
    text: 'GoalPath asks a few smart questions, then turns the answer into a practical roadmap.',
  },
  {
    Icon: TargetIcon,
    eyebrow: 'Daily focus',
    title: 'Know exactly what to do today',
    text: 'Every roadmap highlights the smallest useful next task, so starting feels less heavy.',
  },
  {
    Icon: BarChartIcon,
    eyebrow: 'Progress',
    title: 'Watch momentum build over time',
    text: 'Progress rings, streaks, task history, and badges make effort visible.',
  },
];

const steps = [
  'Describe what you want to learn or finish',
  'Answer quick mentor questions',
  'Follow the roadmap one task at a time',
];

const faqs = [
  {
    question: 'Is this just another to-do app?',
    answer:
      'No. GoalPath connects the full flow: goal setup, quick mentor questions, roadmap generation, daily tasks, and progress tracking in one place.',
  },
  {
    question: 'Does it help with procrastination?',
    answer:
      'Yes. Big goals become smaller actions, so the first step feels easier to start. The mentor also helps simplify the plan when a task feels unclear.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Your goals stay in your account. AI requests are handled through Supabase Edge Functions, and private AI keys are not exposed in the browser.',
  },
];

function isLandingSectionId(value: string): value is LandingSectionId {
  return navLinks.some((link) => link.id === value);
}

function getSectionClassName(baseClassName: string, sectionId: LandingSectionId, highlightedSection: LandingSectionId | null) {
  return highlightedSection === sectionId
    ? `${baseClassName} landing-section-highlight`
    : baseClassName;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState<LandingSectionId | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<LandingSectionId | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const activateSection = (sectionId: LandingSectionId, shouldUpdateHash: boolean) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setActiveSection(sectionId);
    setHighlightedSection(sectionId);
    section.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    if (shouldUpdateHash) {
      window.history.pushState(null, '', `${window.location.pathname}#${sectionId}`);
    }

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSection(null);
      highlightTimeoutRef.current = null;
    }, 850);
  };

  const handleSectionClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: LandingSectionId) => {
    event.preventDefault();
    activateSection(sectionId, true);
  };

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('landing-reveal-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-reveal-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      },
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const syncHashSection = () => {
      const sectionId = window.location.hash.slice(1);

      if (isLandingSectionId(sectionId)) {
        window.requestAnimationFrame(() => activateSection(sectionId, false));
      }
    };

    syncHashSection();
    window.addEventListener('hashchange', syncHashSection);

    return () => {
      window.removeEventListener('hashchange', syncHashSection);

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <a className="landing-brand" href="#top" aria-label="GoalPath home">
          <img src={goalpathLogo} alt="" aria-hidden="true" />
          <span>GoalPath</span>
        </a>
        <div className="landing-nav-links">
          {navLinks.map((link) => (
            <a
              aria-current={activeSection === link.id ? 'true' : undefined}
              data-active={activeSection === link.id}
              href={`#${link.id}`}
              key={link.id}
              onClick={(event) => handleSectionClick(event, link.id)}
            >
              {link.label}
            </a>
          ))}
        </div>
        <button className="landing-nav-cta" type="button" onClick={onGetStarted}>
          Get started
        </button>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy landing-reveal landing-reveal-hero">
          <span className="landing-pill">AI mentor for goals</span>
          <h1>A goal system students can actually finish</h1>
          <p>
            Build goals, generate a roadmap, break tasks into small steps, and track progress with an AI mentor that
            keeps the next move clear.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-primary-button" type="button" onClick={onGetStarted}>
              Start free
              <ArrowRightIcon aria-hidden="true" />
            </button>
            <a className="landing-secondary-button" href="#features" onClick={(event) => handleSectionClick(event, 'features')}>
              See how it works
            </a>
          </div>
          <div className="landing-trust-row" aria-label="Product highlights">
            <span>No credit card</span>
            <span>AI roadmap</span>
            <span>Progress badges</span>
          </div>
        </div>

        <div className="landing-product-stage landing-reveal landing-reveal-hero-preview" aria-label="GoalPath app preview">
          <div className="landing-app-window">
            <div className="landing-window-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="landing-app-grid">
              <aside className="landing-app-sidebar">
                <span className="landing-mini-logo">GP</span>
                <span className="landing-sidebar-line landing-sidebar-line-active" />
                <span className="landing-sidebar-line" />
                <span className="landing-sidebar-line" />
              </aside>
              <section className="landing-app-main">
                <div className="landing-preview-header">
                  <span>Today</span>
                  <strong>Learn JavaScript basics</strong>
                </div>
                <div className="landing-preview-card landing-preview-card-primary">
                  <div>
                    <span>Next step</span>
                    <strong>Build a tiny quiz app</strong>
                    <p>30 minutes - beginner friendly</p>
                  </div>
                  <CheckCircledIcon aria-hidden="true" />
                </div>
                <div className="landing-task-list">
                  {['Watch one short lesson', 'Write 3 functions', 'Test with 5 questions'].map((task, index) => (
                    <div className="landing-task-row" key={task}>
                      <span>{index + 1}</span>
                      <strong>{task}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="landing-app-panel">
                <div className="landing-progress-ring">
                  <span>68%</span>
                </div>
                <strong>Roadmap progress</strong>
                <p>4 tasks completed this week</p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className={getSectionClassName('landing-feature-band', 'features', highlightedSection)} id="features">
        <div className="landing-section-heading landing-reveal">
          <span>Everything in one flow</span>
          <h2>From unclear goal to visible progress</h2>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map(({ Icon, eyebrow, title, text }) => (
            <article className="landing-feature-card landing-reveal" key={title}>
              <Icon aria-hidden="true" />
              <span>{eyebrow}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={getSectionClassName('landing-roadmap-band', 'roadmap', highlightedSection)} id="roadmap">
        <div className="landing-roadmap-copy landing-reveal">
          <span>Built for starting</span>
          <h2>The roadmap stays practical, not overwhelming</h2>
          <p>
            GoalPath keeps the learner close to action: small questions, small tasks, clear feedback, and a mentor panel
            ready when the plan feels stuck.
          </p>
          <button className="landing-primary-button landing-primary-button-dark" type="button" onClick={onGetStarted}>
            Create your first goal
            <RocketIcon aria-hidden="true" />
          </button>
        </div>
        <div className="landing-step-stack" aria-label="GoalPath setup steps">
          {steps.map((step, index) => (
            <div className="landing-step landing-reveal" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-metrics-band landing-reveal" aria-label="GoalPath product stats">
        <div className="landing-reveal">
          <strong>3</strong>
          <span>core screens: goals, roadmap, mentor</span>
        </div>
        <div className="landing-reveal">
          <strong>AI</strong>
          <span>planning through Supabase Edge Functions</span>
        </div>
        <div className="landing-reveal">
          <strong>Daily</strong>
          <span>next task and visible momentum</span>
        </div>
      </section>

      <section className={getSectionClassName('landing-faq-band', 'faq', highlightedSection)} id="faq">
        <div className="landing-section-heading landing-reveal">
          <span>Questions</span>
          <h2>Simple answers before you start</h2>
        </div>
        <div className="landing-faq-list">
          {faqs.map((item) => (
            <details className="landing-faq-item landing-reveal" key={item.question}>
              <summary>
                <strong>{item.question}</strong>
                <LightningBoltIcon aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final-cta landing-reveal">
        <span>Ready to make the first step obvious?</span>
        <h2>Start with one goal. Let the mentor build the path.</h2>
        <button className="landing-primary-button" type="button" onClick={onGetStarted}>
          Get started free
          <ArrowRightIcon aria-hidden="true" />
        </button>
      </section>

      <footer className="landing-footer">
        <span>GoalPath</span>
        <span>AI-powered goal planning for teen learners.</span>
      </footer>
    </main>
  );
}
