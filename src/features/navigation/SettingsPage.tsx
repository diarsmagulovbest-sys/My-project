import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { LanguageToggle } from '../../components/settings/LanguageToggle';
import { PaletteSelector } from '../../components/settings/PaletteSelector';
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
    <div className="page-stack settings-stitch-page">
      <header className="settings-stitch-header">
        <div>
          <span className="eyebrow">Sanctuary controls</span>
          <h1>Settings</h1>
          <p>Adjust your account, language, palette, and hidden path preferences.</p>
        </div>
      </header>

      <section className="settings-stitch-grid" aria-label={t.settings}>
        <article className="settings-stitch-card settings-stitch-card-tall">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">@</span>
            <div>
              <span>Account Details</span>
              <h2>{userEmail ?? t.account}</h2>
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
        </article>

        <article className="settings-stitch-card">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">Aa</span>
            <div>
              <span>Language</span>
              <h2>Guidance voice</h2>
            </div>
          </div>
          <div className="settings-stitch-toggle-line">
            <span>Russian / English</span>
            <LanguageToggle />
          </div>
        </article>

        <article className="settings-stitch-card">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">UI</span>
            <div>
              <span>Global Preferences</span>
              <h2>Display mode</h2>
            </div>
          </div>
          <div className="settings-stitch-toggle-line">
            <span>Light / dark theme</span>
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

        <PaletteSelector />

        <article className="settings-stitch-card settings-stitch-mentor-card">
          <div className="settings-stitch-orb" aria-hidden="true">AI</div>
          <div>
            <span className="eyebrow">Mentor</span>
            <h2>GoalPath Companion</h2>
            <p>Your selected mentor and character choices shape the feel of your journey.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
