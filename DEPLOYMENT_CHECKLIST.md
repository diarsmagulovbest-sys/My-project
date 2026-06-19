# Deployment Checklist

Короткий чеклист перед первым показом MVP другим людям.

## Перед Vercel

- Выполнить `npm run lint`.
- Выполнить `npx tsc -b`.
- Выполнить `npm run build`.
- Проверить `git status` и убедиться, что нет случайных файлов с секретами.
- Убедиться, что `.env` и `.env.local` есть в `.gitignore`.
- Убедиться, что `.env.example` содержит только пустые имена переменных.
- Не запускать `npm audit fix --force` перед релизом без отдельного решения.

## Environment Variables в Vercel

Добавить только публичные клиентские переменные:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Не добавлять Gemini API key в Vercel-переменные с префиксом `VITE_`.

## Supabase

- Проверить, что проект Supabase выбран правильно.
- Применить миграции через `npm run db:push`.
- Проверить, что RLS включен для пользовательских таблиц.
- Проверить, что пользователь видит только свои goals, tasks, conversations, messages и progress logs.
- Проверить Supabase Auth redirect URL для production-домена Vercel.
- Добавить `GEMINI_API_KEY` в Supabase secrets.
- Задеплоить Edge Function через `npm run ai:deploy`.

## Проверка Gemini Edge Function

- Создать тестовую цель в приложении.
- Убедиться, что Mentor Profile выбирается без ошибки.
- Сгенерировать уточняющие вопросы.
- Сгенерировать roadmap.
- Отправить одно сообщение в AI Mentor chat.
- Если Gemini вернул 429, пользователь должен увидеть понятный текст: "AI временно перегружен или достигнут лимит запросов. Попробуй ещё раз через минуту."

## Smoke Test после деплоя

1. Открыть production URL.
2. Зарегистрироваться или войти.
3. Создать цель про programming, Rubik's Cube или taekwondo.
4. Проверить, что на странице цели появился Mentor Profile badge.
5. Ответить на уточняющие вопросы.
6. Сгенерировать roadmap.
7. Убедиться, что задачи отображаются.
8. Отметить одну задачу выполненной.
9. Отправить сообщение в AI Mentor chat.
10. Обновить страницу и проверить, что сообщения сохранились.
11. Нажать "Я застрял" или "Изменить план" и получить предложение адаптации.

## Если что-то сломалось

- Проверить Vercel build logs.
- Проверить Supabase Edge Function logs.
- Проверить, что Vercel env variables совпадают с Supabase Project Settings.
- Проверить, что `GEMINI_API_KEY` добавлен именно в Supabase secrets.
- Откатить последний деплой в Vercel, если MVP не проходит smoke test.
