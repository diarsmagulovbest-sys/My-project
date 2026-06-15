import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Entries } from './components/Entries';
import AnimatedHero from './components/AnimatedHero';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) текущая сессия при загрузке
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // 2) подписка на вход/выход
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <main className="container"><p>Загрузка…</p></main>;

  // Если не залогирован, показываем Auth поверх WebGL фона
  if (!session) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
        <AnimatedHero
          headline={{ line1: '', line2: '' }}
          subtitle=""
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'transparent',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <Auth />
          </div>
        </div>
      </div>
    );
  }

  // Если залогирован, показываем приложение
  return (
    <main className="container">
      <header className="header">
        <h1>Мой проект 🚀</h1>
        {session && (
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            Выйти
          </button>
        )}
      </header>

      <Entries userEmail={session.user.email ?? ''} />
    </main>
  );
}
