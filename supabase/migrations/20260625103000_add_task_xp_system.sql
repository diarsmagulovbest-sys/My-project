do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'difficulty'
  ) then
    alter table public.tasks
      add column difficulty text not null default 'medium';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'is_active_practice'
  ) then
    alter table public.tasks
      add column is_active_practice boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'produces_result'
  ) then
    alter table public.tasks
      add column produces_result boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'is_important'
  ) then
    alter table public.tasks
      add column is_important boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'is_passive'
  ) then
    alter table public.tasks
      add column is_passive boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'xp_value'
  ) then
    alter table public.tasks
      add column xp_value integer not null default 20;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'xp_awarded'
  ) then
    alter table public.tasks
      add column xp_awarded integer not null default 0;
  end if;
end;
$$;

update public.tasks
set
  difficulty = case
    when estimated_minutes <= 10 then 'tiny'
    when estimated_minutes <= 20 then 'easy'
    when estimated_minutes <= 45 then 'medium'
    when estimated_minutes <= 90 then 'hard'
    when estimated_minutes <= 180 then 'major'
    else 'milestone'
  end,
  is_active_practice = (title || ' ' || description) ~* '(practice|solve|build|create|make|cook|write|code|debug|record|test|speak|draw|design|repeat|drill|implement)',
  produces_result = (title || ' ' || description) ~* '(finish|submit|share|ship|build|create|make|write|cook|solve|record|draft|prototype|complete|publish)',
  is_passive = (
    (title || ' ' || description) ~* '(read|watch|listen|search|google|look up|review|study|learn about|tutorial|video)'
    and not ((title || ' ' || description) ~* '(practice|solve|build|create|make|cook|write|code|debug|record|test|speak|draw|design|repeat|drill|implement)')
    and not ((title || ' ' || description) ~* '(finish|submit|share|ship|build|create|make|write|cook|solve|record|draft|prototype|complete|publish)')
  );

update public.tasks
set xp_value = greatest(
  0,
  case difficulty
    when 'tiny' then 5
    when 'easy' then 10
    when 'medium' then 20
    when 'hard' then 35
    when 'major' then 50
    when 'milestone' then 75
    else 20
  end
  + case when is_active_practice then 5 else 0 end
  + case when produces_result then 5 else 0 end
  + case when is_important then 10 else 0 end
  - case when is_passive then 5 else 0 end
);

update public.tasks
set xp_awarded = case
  when status = 'completed' then xp_value
  else 0
end;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_difficulty_check') then
    alter table public.tasks
      add constraint tasks_difficulty_check
      check (difficulty in ('tiny', 'easy', 'medium', 'hard', 'major', 'milestone'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_xp_value_range') then
    alter table public.tasks
      add constraint tasks_xp_value_range check (xp_value between 0 and 150);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_xp_awarded_range') then
    alter table public.tasks
      add constraint tasks_xp_awarded_range check (xp_awarded between 0 and 150);
  end if;
end;
$$;

create index if not exists tasks_goal_status_due_idx on public.tasks (goal_id, status, due_date);
create index if not exists tasks_completed_at_idx on public.tasks (completed_at desc);
