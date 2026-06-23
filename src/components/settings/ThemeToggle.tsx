import { useEffect, useState } from 'react';
import { AnimatedThemeToggler } from '../magic/AnimatedThemeToggler';

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

  const handleThemeChange = (nextTheme: Theme) => {
    applyTheme(nextTheme);
    localStorage.setItem(themeStorageKey, nextTheme);
    setTheme(nextTheme);
  };

  return <AnimatedThemeToggler isDark={isDark} onThemeChange={handleThemeChange} />;
}
