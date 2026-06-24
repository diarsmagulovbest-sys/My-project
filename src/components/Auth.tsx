import { FormEvent, useState } from 'react';
import { useLanguage } from '../lib/language';
import { supabase } from '../lib/supabase';

type AuthMode = 'sign-in' | 'sign-up';

type AuthProps = {
  onBackToLanding?: () => void;
};

export default function Auth({ onBackToLanding }: AuthProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    const authResult = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (authResult.error) {
      setMessage(authResult.error.message);
      return;
    }

    setMessage(
      isSignUp
        ? t.accountCreated
        : t.signedIn,
    );
  };

  const handleGoogleSignIn = async () => {
    setMessage('');
    setIsGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label={t.signInTitle}>
        {onBackToLanding ? (
          <button className="auth-back-button" type="button" onClick={onBackToLanding}>
            Back to overview
          </button>
        ) : null}
        <div className="auth-copy">
          <span className="eyebrow">{t.account}</span>
          <h1>{isSignUp ? t.createAccountTitle : t.signInTitle}</h1>
          <p>{t.authDescription}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label={t.authMode}>
          <button
            className={mode === 'sign-in' ? 'auth-tab auth-tab-active' : 'auth-tab'}
            type="button"
            onClick={() => {
              setMode('sign-in');
              setMessage('');
            }}
          >
            {t.signIn}
          </button>
          <button
            className={mode === 'sign-up' ? 'auth-tab auth-tab-active' : 'auth-tab'}
            type="button"
            onClick={() => {
              setMode('sign-up');
              setMessage('');
            }}
          >
            {t.signUp}
          </button>
        </div>

        <button
          className="auth-google-button"
          disabled={isLoading || isGoogleLoading}
          type="button"
          onClick={() => void handleGoogleSignIn()}
        >
          <span className="auth-google-mark" aria-hidden="true">G</span>
          {isGoogleLoading ? t.signingInWithGoogle : t.continueWithGoogle}
        </button>

        <div className="auth-divider" aria-hidden="true">
          <span />
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-field">
            <span>{t.password}</span>
            <input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.passwordPlaceholder}
            />
          </label>

          {message ? <p className="auth-message">{message}</p> : null}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? t.signingInWait : isSignUp ? t.createAccount : t.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}
