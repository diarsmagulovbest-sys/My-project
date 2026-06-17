-- Goal mentor product schema.
-- Apply with: npm run db:push
-- This migration only adds product tables/policies and does not remove existing data.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  target_date date not null,
  available_time integer not null,
  time_period text not null,
  current_level text not null default '',
  status text not null default 'draft',
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_questions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  question text not null,
  answer text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.roadmap_stages (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  title text not null,
  description text not null default '',
  success_criteria jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  status text not null default 'locked',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  stage_id uuid not null references public.roadmap_stages (id) on delete cascade,
  title text not null,
  description text not null default '',
  estimated_minutes integer not null,
  due_date date,
  sort_order integer not null default 0,
  status text not null default 'todo',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'goals_available_time_positive') then
    alter table public.goals
      add constraint goals_available_time_positive check (available_time > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'goals_time_period_check') then
    alter table public.goals
      add constraint goals_time_period_check check (time_period in ('day', 'week'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'goals_status_check') then
    alter table public.goals
      add constraint goals_status_check check (status in ('draft', 'active', 'paused', 'completed', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'goals_progress_range') then
    alter table public.goals
      add constraint goals_progress_range check (progress between 0 and 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'goal_questions_sort_order_nonnegative') then
    alter table public.goal_questions
      add constraint goal_questions_sort_order_nonnegative check (sort_order >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'roadmap_stages_sort_order_nonnegative') then
    alter table public.roadmap_stages
      add constraint roadmap_stages_sort_order_nonnegative check (sort_order >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'roadmap_stages_status_check') then
    alter table public.roadmap_stages
      add constraint roadmap_stages_status_check check (status in ('locked', 'active', 'completed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_estimated_minutes_positive') then
    alter table public.tasks
      add constraint tasks_estimated_minutes_positive check (estimated_minutes > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_sort_order_nonnegative') then
    alter table public.tasks
      add constraint tasks_sort_order_nonnegative check (sort_order >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_status_check') then
    alter table public.tasks
      add constraint tasks_status_check check (status in ('todo', 'in_progress', 'completed', 'skipped'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'messages_role_check') then
    alter table public.messages
      add constraint messages_role_check check (role in ('user', 'assistant', 'system'));
  end if;
end;
$$;

create index if not exists profiles_updated_at_idx on public.profiles (updated_at);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_user_status_idx on public.goals (user_id, status);
create index if not exists goals_user_target_date_idx on public.goals (user_id, target_date);
create index if not exists goal_questions_goal_sort_idx on public.goal_questions (goal_id, sort_order);
create index if not exists roadmap_stages_goal_sort_idx on public.roadmap_stages (goal_id, sort_order);
create index if not exists tasks_goal_sort_idx on public.tasks (goal_id, sort_order);
create index if not exists tasks_stage_sort_idx on public.tasks (stage_id, sort_order);
create index if not exists tasks_goal_due_date_idx on public.tasks (goal_id, due_date);
create index if not exists progress_logs_goal_created_idx on public.progress_logs (goal_id, created_at desc);
create index if not exists progress_logs_user_created_idx on public.progress_logs (user_id, created_at desc);
create index if not exists conversations_goal_user_idx on public.conversations (goal_id, user_id);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_profiles_updated_at') then
    create trigger set_profiles_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_goals_updated_at') then
    create trigger set_goals_updated_at
      before update on public.goals
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_tasks_updated_at') then
    create trigger set_tasks_updated_at
      before update on public.tasks
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_conversations_updated_at') then
    create trigger set_conversations_updated_at
      before update on public.conversations
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'create_profile_for_new_user') then
    create trigger create_profile_for_new_user
      after insert on auth.users
      for each row execute function public.handle_new_user_profile();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.goal_questions enable row level security;
alter table public.roadmap_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.progress_logs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.goals,
  public.goal_questions,
  public.roadmap_stages,
  public.tasks,
  public.progress_logs,
  public.conversations,
  public.messages
to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles select own') then
    create policy "profiles select own"
      on public.profiles for select
      using (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles insert own') then
    create policy "profiles insert own"
      on public.profiles for insert
      with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles update own') then
    create policy "profiles update own"
      on public.profiles for update
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles delete own') then
    create policy "profiles delete own"
      on public.profiles for delete
      using (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals select own') then
    create policy "goals select own"
      on public.goals for select
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals insert own') then
    create policy "goals insert own"
      on public.goals for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals update own') then
    create policy "goals update own"
      on public.goals for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals delete own') then
    create policy "goals delete own"
      on public.goals for delete
      using (user_id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_questions' and policyname = 'goal_questions select own') then
    create policy "goal_questions select own"
      on public.goal_questions for select
      using (
        exists (
          select 1 from public.goals
          where goals.id = goal_questions.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_questions' and policyname = 'goal_questions insert own') then
    create policy "goal_questions insert own"
      on public.goal_questions for insert
      with check (
        exists (
          select 1 from public.goals
          where goals.id = goal_questions.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_questions' and policyname = 'goal_questions update own') then
    create policy "goal_questions update own"
      on public.goal_questions for update
      using (
        exists (
          select 1 from public.goals
          where goals.id = goal_questions.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.goals
          where goals.id = goal_questions.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_questions' and policyname = 'goal_questions delete own') then
    create policy "goal_questions delete own"
      on public.goal_questions for delete
      using (
        exists (
          select 1 from public.goals
          where goals.id = goal_questions.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roadmap_stages' and policyname = 'roadmap_stages select own') then
    create policy "roadmap_stages select own"
      on public.roadmap_stages for select
      using (
        exists (
          select 1 from public.goals
          where goals.id = roadmap_stages.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roadmap_stages' and policyname = 'roadmap_stages insert own') then
    create policy "roadmap_stages insert own"
      on public.roadmap_stages for insert
      with check (
        exists (
          select 1 from public.goals
          where goals.id = roadmap_stages.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roadmap_stages' and policyname = 'roadmap_stages update own') then
    create policy "roadmap_stages update own"
      on public.roadmap_stages for update
      using (
        exists (
          select 1 from public.goals
          where goals.id = roadmap_stages.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.goals
          where goals.id = roadmap_stages.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roadmap_stages' and policyname = 'roadmap_stages delete own') then
    create policy "roadmap_stages delete own"
      on public.roadmap_stages for delete
      using (
        exists (
          select 1 from public.goals
          where goals.id = roadmap_stages.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks select own') then
    create policy "tasks select own"
      on public.tasks for select
      using (
        exists (
          select 1 from public.goals
          where goals.id = tasks.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks insert own') then
    create policy "tasks insert own"
      on public.tasks for insert
      with check (
        exists (
          select 1
          from public.goals
          join public.roadmap_stages on roadmap_stages.goal_id = goals.id
          where goals.id = tasks.goal_id
            and roadmap_stages.id = tasks.stage_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks update own') then
    create policy "tasks update own"
      on public.tasks for update
      using (
        exists (
          select 1 from public.goals
          where goals.id = tasks.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.goals
          join public.roadmap_stages on roadmap_stages.goal_id = goals.id
          where goals.id = tasks.goal_id
            and roadmap_stages.id = tasks.stage_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks delete own') then
    create policy "tasks delete own"
      on public.tasks for delete
      using (
        exists (
          select 1 from public.goals
          where goals.id = tasks.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress_logs' and policyname = 'progress_logs select own') then
    create policy "progress_logs select own"
      on public.progress_logs for select
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = progress_logs.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress_logs' and policyname = 'progress_logs insert own') then
    create policy "progress_logs insert own"
      on public.progress_logs for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = progress_logs.goal_id
            and goals.user_id = auth.uid()
        )
        and (
          task_id is null
          or exists (
            select 1 from public.tasks
            where tasks.id = progress_logs.task_id
              and tasks.goal_id = progress_logs.goal_id
          )
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress_logs' and policyname = 'progress_logs update own') then
    create policy "progress_logs update own"
      on public.progress_logs for update
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = progress_logs.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = progress_logs.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'progress_logs' and policyname = 'progress_logs delete own') then
    create policy "progress_logs delete own"
      on public.progress_logs for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = progress_logs.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations select own') then
    create policy "conversations select own"
      on public.conversations for select
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = conversations.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations insert own') then
    create policy "conversations insert own"
      on public.conversations for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = conversations.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations update own') then
    create policy "conversations update own"
      on public.conversations for update
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = conversations.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = conversations.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations delete own') then
    create policy "conversations delete own"
      on public.conversations for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = conversations.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages select own') then
    create policy "messages select own"
      on public.messages for select
      using (
        exists (
          select 1 from public.conversations
          where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages insert own') then
    create policy "messages insert own"
      on public.messages for insert
      with check (
        exists (
          select 1 from public.conversations
          where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages update own') then
    create policy "messages update own"
      on public.messages for update
      using (
        exists (
          select 1 from public.conversations
          where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.conversations
          where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages delete own') then
    create policy "messages delete own"
      on public.messages for delete
      using (
        exists (
          select 1 from public.conversations
          where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
      );
  end if;
end;
$$;
