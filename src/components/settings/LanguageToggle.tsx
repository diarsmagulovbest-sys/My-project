import { useLanguage } from '../../lib/language';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const isEnglish = language === 'en';

  const handleToggle = () => {
    setLanguage(isEnglish ? 'ru' : 'en');
  };

  return (
    <button
      aria-label={`${t.language}: ${isEnglish ? 'EN' : 'RU'}`}
      aria-checked={isEnglish}
      className="language-toggle"
      onClick={handleToggle}
      role="switch"
      type="button"
    >
      <span className="language-toggle-thumb" aria-hidden="true">
        <span className={isEnglish ? 'language-flag language-flag-us' : 'language-flag language-flag-ru'} />
      </span>
    </button>
  );
}
