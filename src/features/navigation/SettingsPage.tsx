import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { LanguageToggle } from '../../components/settings/LanguageToggle';
import { ThemeToggle } from '../../components/settings/ThemeToggle';
import { useLanguage } from '../../lib/language';

type SettingsPageProps = {
  canDeleteGoals: boolean;
  isGoalLimitEnabled: boolean;
  maxGoals: number;
  onOpenSecret: () => void;
  onSignOut: () => void;
  userEmail?: string;
};

export function SettingsPage({
  canDeleteGoals,
  isGoalLimitEnabled,
  maxGoals,
  onOpenSecret,
  onSignOut,
  userEmail,
}: SettingsPageProps) {
  const { t } = useLanguage();
  const [isDiscoActive, setIsDiscoActive] = useState(false);
  const [promoValue, setPromoValue] = useState('');
  const promoInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.body.classList.toggle('disco-mode', isDiscoActive);

    return () => {
      document.body.classList.remove('disco-mode');
    };
  }, [isDiscoActive]);

  function applyPromoCommand(value: string, input?: HTMLTextAreaElement) {
    const command = value.trim().toLowerCase();

    if (command === 'disco') {
      setIsDiscoActive(true);
    }

    if (command === 'undisco') {
      setIsDiscoActive(false);
    }

    if (command === 'secret') {
      onOpenSecret();
    }

    setPromoValue('');

    if (input) {
      input.style.height = 'auto';
    }
  }

  function resizePromoInput(input: HTMLTextAreaElement) {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }

  function handlePromoInput(event: FormEvent<HTMLTextAreaElement>) {
    const input = event.currentTarget;

    setPromoValue(input.value);
    resizePromoInput(input);
  }

  function handlePromoKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      applyPromoCommand(promoValue, event.currentTarget);
    }
  }

  return (
    <div className="page-stack settings-stitch-page">
      <header className="settings-stitch-header">
        <div>
          <span className="eyebrow">{t.settingsEyebrow}</span>
          <h1>{t.settings}</h1>
          <p>{t.settingsDescription}</p>
        </div>
      </header>

      <section className="settings-stitch-grid" aria-label={t.settings}>
        <article className="settings-stitch-card settings-stitch-card-tall">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">@</span>
            <div>
              <span>{t.accountDetails}</span>
              <h2 className="settings-account-email">{userEmail ?? t.account}</h2>
            </div>
          </div>
          <div className="settings-stitch-list">
            <div>
              <span>{t.goalLimit}</span>
              <strong>{isGoalLimitEnabled ? t.maxGoalsValue(maxGoals) : t.off}</strong>
            </div>
            <div>
              <span>{t.goalDeletion}</span>
              <strong>{canDeleteGoals ? t.enabled : t.disabled}</strong>
            </div>
          </div>
          <button className="settings-signout-button" onClick={onSignOut} type="button">
            {t.signOut}
          </button>
        </article>

        <article className="settings-stitch-card">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">Aa</span>
            <div>
              <span>{t.language}</span>
              <h2>{t.guidanceVoice}</h2>
            </div>
          </div>
          <div className="settings-stitch-toggle-line">
            <span>{t.languagePair}</span>
            <LanguageToggle />
          </div>
        </article>

        <article className="settings-stitch-card">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">UI</span>
            <div>
              <span>{t.globalPreferences}</span>
              <h2>{t.displayMode}</h2>
            </div>
          </div>
          <div className="settings-stitch-toggle-line">
            <span>{t.themePair}</span>
            <ThemeToggle />
          </div>
          <article className="settings-code-card">
            <label htmlFor="settings-word-box">{t.wordBox}</label>
            <div className="settings-code-control">
              <textarea
                id="settings-word-box"
                className="settings-code-input"
                placeholder={t.wordBoxPlaceholder}
                rows={1}
                spellCheck="false"
                value={promoValue}
                ref={promoInputRef}
                onInput={handlePromoInput}
                onKeyDown={handlePromoKeyDown}
              />
              <button
                className="settings-code-enter"
                type="button"
                onClick={() => applyPromoCommand(promoValue, promoInputRef.current ?? undefined)}
              >
                {t.promoEnter}
              </button>
            </div>
          </article>
        </article>

      </section>
    </div>
  );
}
