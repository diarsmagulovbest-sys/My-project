# AGENTS.md

Краткие постоянные правила проекта для Codex.

## Проект

Учебный продукт nFactorial Teens: веб-приложение с AI-наставником, который помогает пользователю создавать цели, получать дорожную карту, выполнять задачи, отслеживать прогресс и адаптировать план.

Объясняй изменения простыми словами, коротко и доброжелательно.

## Текущий стек

- Vite.
- React 18.
- TypeScript.
- Supabase Database.
- Supabase Authentication.
- Supabase Edge Functions для AI.
- Обычный CSS.
- Vercel.
- Git + GitHub.

Не переносить проект на Next.js без отдельного подтверждения.

Не использовать и не добавлять без подтверждения:

- Next.js;
- App Router;
- Server Components;
- Next.js API routes;
- `next.config.*`;
- Redux или другие глобальные state-management библиотеки.

## AI

Сейчас используется Gemini через `supabase/functions/ai`.

Текущая функция читает `GEMINI_API_KEY` из Supabase secrets / окружения Edge Function и вызывает `gemini-2.0-flash`.

Не менять Gemini на OpenAI или другого провайдера без отдельного подтверждения пользователя.

AI-запросы выполнять только через Supabase Edge Functions. Не вызывать AI-модель напрямую из Vite-клиента.

Секретные AI-ключи запрещено:

- хранить в клиентском коде;
- хранить в переменных с префиксом `VITE_`;
- коммитить в git.

`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` допустимы, потому что это публичные клиентские настройки Supabase. AI-ключи с `VITE_` запрещены.

## Структура проекта

- `src/main.tsx` — вход React-приложения.
- `src/App.tsx` — главный компонент приложения.
- `src/index.css` — стили.
- `src/components/` — маленькие UI-компоненты.
- `src/features/` — фичи: goals, roadmap, mentor.
- `src/lib/supabase.ts` — единственный Supabase-клиент.
- `src/lib/ai.ts` — будущая клиентская обёртка для вызова Edge Function.
- `src/types/` — типы.
- `src/validations/` — будущие схемы проверки AI-ответов.
- `supabase/migrations/` — SQL-миграции.
- `supabase/functions/ai/` — серверная AI-функция.

Не складывать всю логику в один файл.

## Данные и безопасность

- Для данных использовать только Supabase.
- Схему базы менять только через миграции в `supabase/migrations/`.
- На каждую новую таблицу включать RLS.
- Пользователь должен видеть только свои строки.
- Не полагаться только на фильтрацию в интерфейсе.
- Секреты хранить только в `.env.local`, Vercel или Supabase secrets.
- Не трогать `.env` и `.env.local`, если пользователь явно не попросил.

## Рабочий порядок

- Выполняй только текущий подтверждённый этап.
- Не начинай следующий этап без подтверждения пользователя.
- Не добавляй зависимости без явной причины и объяснения.
- Не реализуй несколько несвязанных задач одним изменением.
- После этапа перечисляй изменённые файлы и объясняй результат простыми словами.

## Команды

- `npm install` — установить зависимости.
- `npm run dev` — локальный запуск.
- `npm run build` — TypeScript-проверка и production build.
- `npm run preview` — просмотр production build.
- `npm run db:new -- name` — создать миграцию.
- `npm run db:push` — применить миграции.
- `npm run ai:secret -- GEMINI_API_KEY=...` — установить AI-секрет.
- `npm run ai:deploy` — задеплоить AI-функцию.

ESLint сейчас не настроен, поэтому `npm run lint` отсутствует. Добавлять ESLint нужно отдельным подтверждённым этапом.

## Качество

- TypeScript без необоснованного `any`.
- Маленькие компоненты и понятные имена.
- Loading, empty, error и disabled состояния для пользовательских сценариев.
- Формы должны иметь понятную валидацию.
- Для структурированных AI-ответов рекомендуется Zod.
- Нельзя сохранять невалидный AI-ответ.
- Комментарии добавлять только там, где логика действительно сложная.

## Маршрутизация subagents

Постоянное правило по умолчанию: для каждого пользовательского запроса сначала классифицировать задачу и решить, нужны ли specialist subagents.

- Если задача простая и её можно безопасно решить напрямую, выполнять напрямую без subagents и кратко сказать, что задача достаточно маленькая.
- Если задача выигрывает от specialist help, запускать только нужных subagents.
- Никогда не запускать все 10 агентов по умолчанию.
- Для обычных задач использовать 1-3 агентов.
- Для больших cross-cutting features использовать 4-5 агентов.
- Все 10 агентов использовать только если пользователь явно попросил full project-wide review или full architecture audit.

Доступные агенты:

- `react-specialist`
- `frontend-developer`
- `ui-designer`
- `ui-fixer`
- `typescript-pro`
- `fullstack-developer`
- `backend-developer`
- `node-specialist`
- `api-designer`
- `deployment-engineer`

Правила выбора:

- UI/design/layout: `ui-designer` + `frontend-developer`.
- Specific visual bug: сначала `ui-fixer`, `frontend-developer` только если нужна реализация.
- React components/hooks/state: `react-specialist` + `frontend-developer`.
- TypeScript errors/types: `typescript-pro` + relevant domain agent.
- Full-stack feature: `fullstack-developer` + `frontend-developer` + `backend-developer`.
- Backend/server/database/auth: `backend-developer` + `node-specialist`.
- API contracts/endpoints/request-response design: `api-designer` + `backend-developer`.
- Deployment/build/env/Vercel/production errors: `deployment-engineer` + `node-specialist`.
- Large feature with frontend, backend, API, and deployment: `fullstack-developer` + `frontend-developer` + `backend-developer` + `api-designer` + `deployment-engineer`.

Перед использованием subagents:

- Кратко сказать, какие agents выбраны и почему.
- Если subagents не нужны, сказать, что задача достаточно маленькая для прямого решения.

После ответа subagents:

- Объединить их выводы в один финальный ответ или один patch.
- Если agents расходятся, выбрать smallest safe change.
- Не заставлять пользователя вручную выбирать agents, кроме случаев, когда неоднозначность влияет на product decisions.
