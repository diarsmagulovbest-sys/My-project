-- Stores the first AI analysis created when a user submits a goal.

create table if not exists public.goal_ai_responses (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_summary text not null,
  estimated_user_level text not null,
  steps jsonb not null default '[]'::jsonb,
  clarification_questions jsonb not null default '[]'::jsonb,
  first_small_action text not null,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists goal_ai_responses_goal_id_idx on public.goal_ai_responses (goal_id);
create index if not exists goal_ai_responses_user_id_idx on public.goal_ai_responses (user_id);

alter table public.goal_ai_responses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goal_ai_responses_goal_user_unique'
  ) then
    alter table public.goal_ai_responses
      add constraint goal_ai_responses_goal_user_unique unique (goal_id, user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_ai_responses'
      and policyname = 'goal_ai_responses select own'
  ) then
    create policy "goal_ai_responses select own"
      on public.goal_ai_responses for select
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = goal_ai_responses.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_ai_responses'
      and policyname = 'goal_ai_responses insert own'
  ) then
    create policy "goal_ai_responses insert own"
      on public.goal_ai_responses for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = goal_ai_responses.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_ai_responses'
      and policyname = 'goal_ai_responses update own'
  ) then
    create policy "goal_ai_responses update own"
      on public.goal_ai_responses for update
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = goal_ai_responses.goal_id
            and goals.user_id = auth.uid()
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = goal_ai_responses.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'goal_ai_responses'
      and policyname = 'goal_ai_responses delete own'
  ) then
    create policy "goal_ai_responses delete own"
      on public.goal_ai_responses for delete
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.goals
          where goals.id = goal_ai_responses.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end $$;
