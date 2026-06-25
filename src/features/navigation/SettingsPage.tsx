import { useState } from 'react';
import { LanguageToggle } from '../../components/settings/LanguageToggle';
import { useLanguage } from '../../lib/language';

type SettingsPageProps = {
  canDeleteGoals: boolean;
  isGoalLimitEnabled: boolean;
  maxGoals: number;
  onSignOut: () => void;
  userEmail?: string;
};

export function SettingsPage({
  canDeleteGoals,
  isGoalLimitEnabled,
  maxGoals,
  onSignOut,
  userEmail,
}: SettingsPageProps) {
  const { t } = useLanguage();
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  const handlePromoSubmit = () => {
    const normalizedCode = promoCode.trim().toLowerCase();

    if (normalizedCode !== 'presentation') {
      setPromoMessage('Введите presentation, чтобы открыть презентацию.');
      return;
    }

    setPromoMessage('Открываю презентацию...');
    window.open('/GoalPath_presentation.html', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page-stack settings-stitch-page">
      <header className="settings-stitch-header">
        <div>
          <span className="eyebrow">{t.settingsEyebrow}</span>
          <h1>{t.settings}</h1>
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
            </div>
          </div>
          <div className="settings-stitch-toggle-line">
            <span>{t.languagePair}</span>
            <LanguageToggle />
          </div>
        </article>

        <article className="settings-stitch-card settings-code-card">
          <div className="settings-stitch-card-heading">
            <span className="settings-stitch-icon" aria-hidden="true">#</span>
            <div>
              <span>Promo words</span>
              <h2>Секретный доступ</h2>
            </div>
          </div>
          <label htmlFor="settings-promo-code">Введи промо-слово</label>
          <div className="settings-code-control">
            <input
              className="settings-code-input"
              id="settings-promo-code"
              onChange={(event) => {
                setPromoCode(event.target.value);
                setPromoMessage('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handlePromoSubmit();
                }
              }}
              placeholder="presentation"
              type="text"
              value={promoCode}
            />
            <button className="settings-code-enter" onClick={handlePromoSubmit} type="button">
              Enter
            </button>
          </div>
          {promoMessage ? <p className="settings-code-message">{promoMessage}</p> : null}
        </article>

      </section>
    </div>
  );
}
