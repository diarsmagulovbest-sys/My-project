import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { LanguageToggle } from '../../components/settings/LanguageToggle';
import { ThemeToggle } from '../../components/settings/ThemeToggle';
import { useLanguage } from '../../lib/language';

type SettingsPageProps = {
  canDeleteGoals: boolean;
  isGoalLimitEnabled: boolean;
  maxGoals: number;
  onOpenSecret: () => void;
  userEmail?: string;
};

export function SettingsPage({
  canDeleteGoals,
  isGoalLimitEnabled,
  maxGoals,
  onOpenSecret,
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
    <div className="page-stack">
      <div className="settings-toggle-row">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <section className="settings-grid" aria-label={t.settings}>
        <article className="settings-card">
          <span>{t.signedInAs}</span>
          <strong>{userEmail ?? t.account}</strong>
        </article>
        <article className="settings-card">
          <span>{t.goalLimit}</span>
          <strong>{isGoalLimitEnabled ? t.maxGoalsValue(maxGoals) : t.off}</strong>
        </article>
        <article className="settings-card">
          <span>{t.goalDeletion}</span>
          <strong>{canDeleteGoals ? t.enabled : t.disabled}</strong>
        </article>
        <article className="settings-card settings-code-card">
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
      </section>
    </div>
  );
}
