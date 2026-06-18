alter table public.goals
  add column if not exists mentor_profile_id text not null default 'general';

update public.goals
set mentor_profile_id = 'general'
where mentor_profile_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_mentor_profile_id_check'
  ) then
    alter table public.goals
      add constraint goals_mentor_profile_id_check
      check (
        mentor_profile_id in (
          'general',
          'programming',
          'language_learning',
          'fitness',
          'martial_arts',
          'school_exam',
          'music',
          'puzzle_logic',
          'creative_skill',
          'business_project'
        )
      );
  end if;
end;
$$;
