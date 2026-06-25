import { useEffect, useState } from 'react';
import { AnimatedThemeToggler } from '../magic/AnimatedThemeToggler';
import { applyTheme, getInitialTheme, themeStorageKey, type Theme } from '../../lib/theme';

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
