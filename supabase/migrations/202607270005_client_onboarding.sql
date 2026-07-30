begin;

alter table public.client_profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists terms_accepted_at timestamptz;

grant update(onboarding_completed, onboarding_completed_at, terms_accepted_at) on public.client_profiles to authenticated;
notify pgrst, 'reload schema';

commit;
