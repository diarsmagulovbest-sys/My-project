# nFactorial Teens AI Mentor

Учебное веб-приложение, которое помогает подростку превратить цель в понятный план: создать цель, ответить на уточняющие вопросы, получить roadmap, выполнять задачи, общаться с AI-наставником и просить адаптацию плана, если стало сложно.

## Основной сценарий

1. Пользователь входит в аккаунт через Supabase Auth.
2. Создает цель и описывает свой уровень, сроки и доступное время.
3. Приложение выбирает подходящий Mentor Profile для цели.
4. Пользователь отвечает на уточняющие вопросы.
5. AI создает roadmap и задачи.
6. Пользователь отмечает задачи и видит прогресс.
7. Пользователь общается с AI Mentor по конкретной цели.
8. Если пользователь застрял, AI предлагает короткую адаптацию плана без автоматического изменения roadmap.

## Стек

- Vite
- React 18
- TypeScript
- Supabase Database
- Supabase Authentication
- Supabase Edge Functions для AI
- Gemini через Supabase Edge Function
- Zod для проверки структурированных AI-ответов
- Обычный CSS
- Vercel

## Локальный запуск

```bash
npm install
```

Создай локальный env-файл:

```bash
cp .env.example .env.local
```

Заполни `.env.local` значениями из Supabase Project Settings:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Запусти приложение:

```bash
npm run dev
```

Production-проверка:

```bash
npm run build
npm run preview
```

## Supabase и AI

Миграции применяются через Supabase CLI:

```bash
npm run db:login
npm run db:link
npm run db:push
```

AI-ключ Gemini должен храниться только в Supabase secrets, не в клиентском коде и не в переменных `VITE_*`:

```bash
npm run ai:secret -- GEMINI_API_KEY=your_key_here
npm run ai:deploy
```

Для Vercel нужны только публичные клиентские переменные:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Что уже работает

- Регистрация и вход пользователя.
- Создание целей.
- Автоматический выбор Mentor Profile для новой цели с безопасным fallback на general.
- Отображение выбранного наставника на странице цели.
- Генерация уточняющих вопросов с учетом Mentor Profile.
- Генерация roadmap с учетом Mentor Profile.
- Просмотр и выполнение задач.
- AI Mentor chat для конкретной цели с сохранением сообщений.
- Короткие практичные ответы AI Mentor.
- Предложение адаптации плана, если пользователь застрял.
- Понятное сообщение при Gemini rate limit 429.
- Settings с базовыми пользовательскими настройками.

## Что пока не реализовано

- Автоматическое применение предложенной адаптации к roadmap и задачам.
- Полноценное редактирование roadmap после генерации.
- Уведомления и напоминания.
- Админ-панель, модерация и аналитика.
- E2E-тесты основного сценария.
- Production-настройки email-шаблонов Supabase Auth.

## Проверки перед публикацией

Перед деплоем стоит выполнить:

```bash
npm run lint
npx tsc -b
npm run build
```

Также проверь, что `.env` и `.env.local` не попали в git, а `GEMINI_API_KEY` хранится только в Supabase secrets.
my-project-seven-alpha-27.vercel.app
