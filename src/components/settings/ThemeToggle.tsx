import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

const themeStorageKey = 'app-theme';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem(themeStorageKey);

  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const isDark = theme === 'dark';

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const handleToggle = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-checked={isDark}
      className="theme-toggle"
      onClick={handleToggle}
      role="switch"
      type="button"
    >
      <span className="theme-toggle-icon theme-toggle-icon-light" aria-hidden="true">
        <SunIcon />
      </span>
      <span className="theme-toggle-thumb" aria-hidden="true">
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="theme-toggle-icon theme-toggle-icon-dark" aria-hidden="true">
        <MoonIcon />
      </span>
    </button>
  );
}
