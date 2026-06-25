alter table public.goal_questions
  drop constraint if exists goal_questions_single_choice_shape_check;

update public.goal_questions
set
  answer_options = (
    select jsonb_agg(option.value order by option.ordinality)
    from jsonb_array_elements(answer_options) with ordinality as option(value, ordinality)
    where option.ordinality <= 4
  ),
  answer = case
    when selected_option_index between 0 and 3 then answer
    else null
  end,
  selected_option_index = case
    when selected_option_index between 0 and 3 then selected_option_index
    else null
  end
where response_kind = 'single_choice'
  and answer_options is not null
  and jsonb_typeof(answer_options) = 'array'
  and jsonb_array_length(answer_options) > 4;

create or replace function public.goal_question_answer_options_are_valid(options jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 4
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
      and (selected_option_index is null or selected_option_index between 0 and 3)
    )
  );
