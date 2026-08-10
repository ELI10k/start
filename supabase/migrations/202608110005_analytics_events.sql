-- A minimal event log: enough to answer "does anyone finish a workout" and "what
-- broke", and deliberately not enough to reconstruct what a person ate, weighed
-- or wrote.
--
-- Properties are a small jsonb object of counts and flags. The client-side
-- redaction is what keeps free text out; this table adds the second half of that
-- guarantee - authenticated users can insert their own events and read none,
-- including their own. There is no path here for one client to learn anything
-- about another, and no path for the app to display an event back to anyone.
--
-- Rollback: drop table public.analytics_events;

begin;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event text not null check (length(trim(event)) between 1 and 60),
  properties jsonb not null default '{}'::jsonb,
  platform text not null default 'web' check (platform in ('web', 'ios', 'android')),
  app_version text check (app_version is null or length(app_version) <= 40),
  occurred_at timestamptz not null default now()
);
create index if not exists analytics_events_event_time_idx on public.analytics_events(event, occurred_at desc);
create index if not exists analytics_events_user_time_idx on public.analytics_events(user_id, occurred_at desc);

alter table public.analytics_events enable row level security;

-- Insert-only, and only as yourself. No select policy at all: nothing in the
-- product reads these back, so granting a read would be surface with no purpose.
drop policy if exists analytics_events_self_insert on public.analytics_events;
create policy analytics_events_self_insert on public.analytics_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on table public.analytics_events from anon, authenticated;
grant insert on table public.analytics_events to authenticated;

commit;
