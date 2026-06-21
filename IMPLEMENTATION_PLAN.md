# IMPLEMENTATION_PLAN.md

## 1. Продукт

Приложение помогает пользователю достигать целей с помощью AI-наставника.

Основной сценарий:

1. Пользователь регистрируется или входит.
2. Создаёт цель.
3. Указывает срок, доступное время и пожелания.
4. AI задаёт уточняющие вопросы.
5. Пользователь отвечает.
6. AI создаёт дорожную карту с этапами и задачами.
7. Пользователь выполняет задачи и отмечает прогресс.
8. AI-наставник помогает, если пользователь застрял.
9. План можно адаптировать после пропусков или изменения условий.

## 2. Реальный стек проекта

Проект продолжается на текущем стеке:

- Vite;
- React 18;
- TypeScript;
- обычный CSS;
- Supabase Authentication;
- Supabase Database;
- Supabase Edge Functions для безопасных AI-запросов;
- Vercel;
- Git.

Проект не переносим на Next.js.

Из плана исключены требования, относящиеся только к Next.js:

- App Router;
- Server Components;
- Next.js API routes;
- `next.config.*`.

## 3. Текущее состояние

Уже есть:

- регистрация, вход и выход через Supabase Auth;
- базовый интерфейс Этапа 1 на локальных данных;
- dashboard целей;
- форма создания цели;
- страница одной цели;
- Supabase-клиент `src/lib/supabase.ts`;
- Edge Function `supabase/functions/ai`.

Текущая AI-функция использует Gemini:

- секрет: `GEMINI_API_KEY`;
- модель: `gemini-2.0-flash`;
- хранение ключа: Supabase secrets / окружение Edge Function.

AI-провайдера не менять без отдельного подтверждения.

## 4. Правила секретов

AI-ключи должны храниться только:

- в Supabase secrets;
- в окружении Supabase Edge Function.

AI-ключи нельзя хранить:

- в Vite-клиенте;
- в переменных с префиксом `VITE_`;
- в коде;
- в git.

`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` допустимы, потому что это публичные настройки Supabase-клиента.

## 5. Архитектура

Рекомендуемая структура:

```text
src/
  main.tsx
  App.tsx
  index.css
  components/
    common/
    layout/
  features/
    auth/
    goals/
    roadmap/
    mentor/
  lib/
    supabase.ts
    ai.ts
  types/
    database.ts
    goal.ts
  validations/
    aiResponses.ts
  utils/
    dates.ts
    progress.ts
supabase/
  migrations/
  functions/
    ai/
```

Принципы:

- UI — маленькими компонентами.
- Бизнес-логику группировать по `features`.
- Supabase-запросы выносить в отдельные API-файлы внутри фич.
- AI вызывать только через Supabase Edge Function.
- Структурированные AI-ответы проверять перед сохранением.

## 6. База данных

Планируемые таблицы:

- `profiles`
- `goals`
- `goal_questions`
- `roadmap_stages`
- `tasks`
- `progress_logs`
- `conversations`
- `messages`

Основные поля:

```text
profiles:
  id, display_name, created_at, updated_at

goals:
  id, user_id, title, description, target_date, available_time,
  time_period, current_level, status, progress, created_at, updated_at

goal_questions:
  id, goal_id, question, answer, sort_order, created_at

roadmap_stages:
  id, goal_id, title, description, success_criteria, sort_order, status, created_at

tasks:
  id, goal_id, stage_id, title, description, estimated_minutes,
  due_date, sort_order, status, completed_at, created_at, updated_at

progress_logs:
  id, goal_id, task_id, user_id, action, note, created_at

conversations:
  id, goal_id, user_id, created_at, updated_at

messages:
  id, conversation_id, role, content, created_at
```

RLS обязателен на каждой таблице. Пользователь должен видеть только свои данные.

## 7. Zod

Для проверки AI-ответов рекомендуется добавить `zod`.

Добавлять Zod нужно отдельным маленьким этапом, перед реализацией генерации вопросов и дорожной карты.

Пока Zod не установлен, AI-ответы нельзя сохранять без ручной проверки структуры.

## 8. Этапы разработки

### Этап 1. Основа интерфейса без базы и AI

Статус: выполнен.

Готово:

- dashboard;
- форма создания цели;
- страница одной цели;
- локальные временные данные;
- адаптивная структура;
- loading, empty, error, disabled состояния на уровне UI.

Проверка:

- `npx tsc -b`;
- `npm run build`.

### Этап 2. Настройка ESLint

Цель: добавить базовую проверку качества кода.

Изменяемые файлы:

- `package.json`;
- `package-lock.json`;
- новый конфиг ESLint.

Новые файлы:

- `eslint.config.js` или другой актуальный ESLint-конфиг.

Зависимости:

- `eslint`;
- TypeScript/React ESLint-пакеты, если нужны для корректной проверки проекта.

Риски:

- ESLint может найти существующие проблемы, которые не связаны с новым этапом.
- Нельзя отключать правила просто ради прохождения проверки.

Критерии готовности:

- есть script `npm run lint`;
- `npm run lint` запускается;
- `npm run build` проходит.

Проверка:

- `npm run lint`;
- `npx tsc -b`;
- `npm run build`.

### Этап 3. Схема Supabase и RLS

Статус: выполнен.

Цель: создать таблицы и политики безопасности.

Изменяемые файлы:

- `supabase/migrations/*`.

Новые файлы:

- новая SQL-миграция.

Зависимости: не добавлять.

Критерии готовности:

- таблицы созданы;
- RLS включён;
- политики ограничивают доступ текущим пользователем;
- пользователь не может читать чужие цели.

Проверка:

- `npm run db:push` — выполнено, миграция применена к linked Supabase проекту;
- `npx supabase db lint --linked --schema public --fail-on error` — выполнено, ошибок схемы нет;
- `npm run lint` — выполнено;
- `npx tsc -b` — выполнено;
- `npm run build` — выполнено.

### Этап 4. Подключение реальных целей из Supabase

Статус: выполнен.

Цель: заменить локальные цели реальными данными из базы.

Изменяемые файлы:

- `src/App.tsx`;
- `src/features/goals/*`;
- `src/types/*`.

Новые файлы:

- `src/features/goals/goalsApi.ts`;
- `src/types/goal.ts`;
- `src/types/database.ts`.

Зависимости: не добавлять.

Критерии готовности:

- пользователь видит только свои цели;
- можно создать цель;
- пустая форма не отправляется;
- ошибки Supabase показываются понятно.

Проверка:

- `npm run lint` — выполнено;
- `npx tsc -b` — выполнено;
- `npm run build` — выполнено.

### Этап 5. Добавление Zod для AI-ответов

Статус: выполнен.

Цель: подготовить безопасную проверку структурированных AI-ответов.

Изменяемые файлы:

- `package.json`;
- `package-lock.json`.

Новые файлы:

- `src/validations/aiResponses.ts`.

Зависимости:

- `zod`.

Критерии готовности:

- есть схемы для вопросов;
- есть схема для дорожной карты;
- невалидный объект можно отловить до сохранения.

Проверка:

- `npm run lint` — выполнено;
- `npx tsc -b` — выполнено;
- `npm run build` — выполнено.

### Этап 6. Генерация уточняющих вопросов

Статус: выполнен.

Цель: вызвать Gemini через Supabase Edge Function и сохранить вопросы.

Изменённые файлы:

- `src/App.tsx`;
- `src/features/goals/GoalDetailMock.tsx`;
- `src/index.css`;
- `IMPLEMENTATION_PLAN.md`.

Новые файлы:

- `src/lib/ai.ts`;
- `src/types/goalQuestion.ts`;
- `src/features/goals/generateQuestions.ts`;
- `src/features/goals/GoalQuestionsPanel.tsx`;
- `src/features/goals/questionsApi.ts`.

Зависимости: новые зависимости не добавлялись, используется Zod из этапа 5.

Критерии готовности:

- AI создаёт 5-6 вопросов;
- вопросы зависят от цели;
- результат проверяется через Zod;
- невалидный ответ не сохраняется;
- ответы пользователя сохраняются в `goal_questions`.

Проверка:

- `npm run lint` — выполнено;
- `npx tsc -b` — выполнено;
- `npm run build` — выполнено.

### Этап 7. Генерация дорожной карты

Статус: выполнен.

Цель: получить структурированный план, проверить его и сохранить этапы/задачи.

Изменённые файлы:

- `src/App.tsx`;
- `src/features/goals/GoalDetailMock.tsx`;
- `src/features/goals/GoalQuestionsPanel.tsx`;
- `src/index.css`;
- `IMPLEMENTATION_PLAN.md`.

Новые файлы:

- `src/features/roadmap/RoadmapView.tsx`;
- `src/features/roadmap/roadmapApi.ts`.
- `src/features/roadmap/generateRoadmap.ts`;
- `src/types/roadmap.ts`.

Критерии готовности:

- план учитывает срок и доступное время;
- этапы и задачи сохраняются;
- невалидный AI-ответ не сохраняется;
- пользователь видит понятную ошибку и может повторить.

Проверка:

- `npm run lint` — выполнено;
- `npx tsc -b` — выполнено;
- `npm run build` — выполнено.

### Этап 8. Прогресс и задачи

Цель: отмечать задачи выполненными, пересчитывать прогресс и писать журнал.

Изменяемые файлы:

- `src/features/roadmap/*`;
- `src/features/goals/*`.

Новые файлы:

- `src/utils/progress.ts`;
- `src/features/roadmap/tasksApi.ts`.

Критерии готовности:

- выполнение задачи обновляет статус и `completed_at`;
- прогресс пересчитывается;
- создаётся запись в `progress_logs`;
- текущая задача отображается корректно.

Проверка:

- `npm run lint`;
- `npx tsc -b`;
- `npm run build`.

### Этап 9. AI-наставник

Цель: чат по конкретной цели с сохранением сообщений.

Изменяемые файлы:

- `src/features/mentor/*`;
- `src/lib/ai.ts`.

Новые файлы:

- `src/features/mentor/MentorPanel.tsx`;
- `src/features/mentor/mentorApi.ts`.

Критерии готовности:

- сообщения сохраняются;
- AI получает только релевантный контекст цели;
- AI не меняет план без подтверждения пользователя;
- есть loading/error состояния.

Проверка:

- `npm run lint`;
- `npx tsc -b`;
- `npm run build`.

### Этап 10. Адаптация плана

Цель: пользователь указывает причину проблемы, AI предлагает изменение, пользователь подтверждает.

Изменяемые файлы:

- `src/features/roadmap/*`;
- `src/features/mentor/*`;
- `src/lib/ai.ts`.

Новые файлы:

- `src/features/roadmap/PlanAdjustmentDialog.tsx`.

Критерии готовности:

- есть выбор причины;
- AI предлагает изменения;
- изменение применяется только после подтверждения;
- старая история прогресса не теряется.

Проверка:

- `npm run lint`;
- `npx tsc -b`;
- `npm run build`.

### Этап 11. Финальная проверка и README

Цель: проверить безопасность, адаптивность и документацию.

Изменяемые файлы:

- `README.md`;
- при необходимости мелкие исправления.

Критерии готовности:

- проверены RLS-политики;
- проверены формы;
- проверена мобильная версия;
- README описывает запуск, Supabase и AI-секреты;
- AI-ключи не попадают в клиентский код.

Проверка:

- `npm run lint`;
- `npx tsc -b`;
- `npm run build`.

## 9. Следующий этап

Следующий рекомендуемый этап: **Этап 2. Настройка ESLint**.

Причина: пользователь просит запускать lint после этапов, но сейчас `npm run lint` отсутствует. Лучше сначала добавить маленькую проверку качества, а потом переходить к базе данных и RLS.

## Adaptive Mentor Profiles

Status: Stage 5 completed.

Done:

- added TypeScript mentor profile ids and profile structure;
- added initial profile list as code constants;
- added helper functions for default profile, id validation, profile lookup, and system prompt context;
- added Zod validation and TypeScript type for future goal-to-mentor-profile classification;
- added standalone AI classification function with safe fallback to general;
- added mentor_profile_id column to goals with default general and safe profile id constraint;
- connected goal creation to classify and save mentor_profile_id with fallback to general;
- did not connect profiles to question generation, roadmap generation, mentor chat, or UI yet.

## Mentor Characters

Status: Stage 1 completed.

Done:

- added Mentor Character TypeScript ids and structure;
- added the first character list as code constants;
- added helper functions for default character, id validation, character lookup, and future system prompt context;
- did not connect characters to UI, AI, goals, Supabase, migrations, or navigation yet.
