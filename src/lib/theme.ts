export const themeStorageKey = 'app-theme';

export type Theme = 'light' | 'dark';

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  try {
    const savedTheme = localStorage.getItem(themeStorageKey);

    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : getSystemTheme();
  } catch {
    return getSystemTheme();
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}
