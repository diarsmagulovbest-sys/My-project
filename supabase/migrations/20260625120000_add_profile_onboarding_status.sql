alter table public.profiles
  add column if not exists onboarding_status text not null default 'new';

alter table public.profiles
  drop constraint if exists profiles_onboarding_status_check;

alter table public.profiles
  add constraint profiles_onboarding_status_check
  check (onboarding_status in ('new', 'dismissed', 'completed'));

update public.profiles
set onboarding_status = 'completed'
where onboarding_status = 'new';
