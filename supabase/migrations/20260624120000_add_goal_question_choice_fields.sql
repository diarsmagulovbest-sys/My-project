create or replace function public.goal_question_answer_options_are_valid(options jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) = 5
    and not exists (
      select 1
      from jsonb_array_elements(options) as option(value)
      where jsonb_typeof(option.value) <> 'string'
        or btrim(option.value #>> '{}') = ''
        or length(option.value #>> '{}') > 500
    ),
    false
  );
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'goal_questions'
      and column_name = 'response_kind'
  ) then
    alter table public.goal_questions
      add column response_kind text not null default 'free_text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'goal_questions'
      and column_name = 'answer_options'
  ) then
    alter table public.goal_questions
      add column answer_options jsonb;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'goal_questions'
      and column_name = 'selected_option_index'
  ) then
    alter table public.goal_questions
      add column selected_option_index integer;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'goal_questions_response_kind_check'
  ) then
    alter table public.goal_questions
      add constraint goal_questions_response_kind_check
      check (response_kind in ('free_text', 'single_choice'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'goal_questions_single_choice_shape_check'
  ) then
    alter table public.goal_questions
      add constraint goal_questions_single_choice_shape_check
      check (
        (
          response_kind = 'free_text'
          and answer_options is null
          and selected_option_index is null
        )
        or (
          response_kind = 'single_choice'
          and public.goal_question_answer_options_are_valid(answer_options) is true
          and (selected_option_index is null or selected_option_index between 0 and 4)
        )
      );
  end if;
end;
$$;
