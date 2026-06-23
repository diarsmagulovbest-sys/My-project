import { useLanguage } from '../../lib/language';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const isRussian = language === 'ru';

  const handleToggle = () => {
    setLanguage(isRussian ? 'en' : 'ru');
  };

  return (
    <button
      aria-label={`${t.language}: ${isRussian ? 'RU' : 'EN'}`}
      aria-checked={isRussian}
      className="language-toggle"
      onClick={handleToggle}
      role="switch"
      type="button"
    >
      <span className="language-toggle-thumb" aria-hidden="true">
        <span className={isRussian ? 'language-flag language-flag-ru' : 'language-flag language-flag-us'} />
      </span>
    </button>
  );
}
