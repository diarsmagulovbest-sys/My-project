import type { MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

type Theme = 'light' | 'dark';

type AnimatedThemeTogglerProps = {
  isDark: boolean;
  onThemeChange: (theme: Theme) => void;
};

type ViewTransition = {
  finished?: Promise<void>;
  ready?: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

function getCircleClipPaths(button: HTMLButtonElement) {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const { height, left, top, width } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const maxRadius = Math.hypot(Math.max(x, viewportWidth - x), Math.max(y, viewportHeight - y));

  return [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`];
}

export function AnimatedThemeToggler({ isDark, onThemeChange }: AnimatedThemeTogglerProps) {
  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const nextTheme: Theme = isDark ? 'light' : 'dark';
    const documentWithTransition = document as DocumentWithViewTransition;

    const applyNextTheme = () => {
      onThemeChange(nextTheme);
    };

    if (typeof documentWithTransition.startViewTransition !== 'function') {
      applyNextTheme();
      return;
    }

    const clipPath = getCircleClipPaths(button);
    const transition = documentWithTransition.startViewTransition(() => {
      flushSync(applyNextTheme);
    });

    transition.ready?.then(() => {
      document.documentElement.animate(
        { clipPath },
        {
          duration: 360,
          easing: 'ease-in-out',
          fill: 'forwards',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  };

  return (
    <button
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-checked={isDark}
      className="theme-toggle theme-toggle-magic"
      onClick={handleToggle}
      role="switch"
      type="button"
    >
      <span className="theme-toggle-thumb" aria-hidden="true">
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
