import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getInitialLanguage,
  languageStorageKey,
  LanguageContext,
  text,
  type AppLanguage,
} from './language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => getInitialLanguage());
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: text[language],
    }),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(languageStorageKey, language);
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
