import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthMode = 'sign-in' | 'sign-up';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        ? 'Аккаунт создан. Если Supabase попросит подтверждение, проверь почту.'
        : 'Вход выполнен.',
    );
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Вход в аккаунт">
        <div className="auth-copy">
          <span className="eyebrow">Аккаунт</span>
          <h1>{isSignUp ? 'Создай аккаунт' : 'Войди в аккаунт'}</h1>
          <p>Войди или зарегистрируйся, чтобы пользоваться приложением под своим профилем.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Режим авторизации">
          <button
            className={mode === 'sign-in' ? 'auth-tab auth-tab-active' : 'auth-tab'}
            type="button"
            onClick={() => {
              setMode('sign-in');
              setMessage('');
            }}
          >
            Вход
          </button>
          <button
            className={mode === 'sign-up' ? 'auth-tab auth-tab-active' : 'auth-tab'}
            type="button"
            onClick={() => {
              setMode('sign-up');
              setMessage('');
            }}
          >
            Регистрация
          </button>
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
            <span>Пароль</span>
            <input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 6 символов"
            />
          </label>

          {message ? <p className="auth-message">{message}</p> : null}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? 'Подождите...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}
