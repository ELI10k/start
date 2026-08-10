begin;

-- Steps arrive from Apple HealthKit on iOS and Health Connect on Android, both
-- of which already merge whatever the user wears - phone, watch, ring - into one
-- daily figure per source. START stores that figure; it never adds sources
-- together, because a phone and a watch worn on the same walk would count it
-- twice.
--
-- One row per client per day per source. Re-syncing the same day overwrites that
-- row rather than appending, which is what keeps a repeated sync from inflating
-- the total.
--
-- Rollback: drop function public.record_health_steps(date,integer,text,timestamptz);
--           drop function public.set_daily_step_goal(integer);
--           drop table public.health_steps;
--           drop table public.health_preferences;

create table if not exists public.health_steps (
  client_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  source text not null check (source in ('healthkit', 'health-connect', 'manual', 'test')),
  steps integer not null check (steps >= 0 and steps <= 200000),
  recorded_at timestamptz not null default now(),
  primary key (client_id, day, source)
);
create index if not exists health_steps_client_day_idx on public.health_steps (client_id, day desc);

create table if not exists public.health_preferences (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  daily_step_goal integer not null default 10000 check (daily_step_goal between 1000 and 50000),
  last_sync_at timestamptz,
  last_sync_source text check (last_sync_source is null or last_sync_source in ('healthkit', 'health-connect', 'manual', 'test')),
  updated_at timestamptz not null default now()
);

alter table public.health_steps enable row level security;
alter table public.health_preferences enable row level security;

-- A client owns their own step history. A coach may read their own clients' and
-- nobody else's - the same isolation every other client table here uses.
drop policy if exists health_steps_client_all on public.health_steps;
create policy health_steps_client_all on public.health_steps
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists health_steps_coach_read on public.health_steps;
create policy health_steps_coach_read on public.health_steps
  for select to authenticated
  using (public.is_coach_for(client_id));

drop policy if exists health_preferences_client_all on public.health_preferences;
create policy health_preferences_client_all on public.health_preferences
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists health_preferences_coach_read on public.health_preferences;
create policy health_preferences_coach_read on public.health_preferences
  for select to authenticated
  using (public.is_coach_for(client_id));

-- The day is decided by the caller, from the phone's own calendar in
-- Asia/Jerusalem. Deriving it here would use the database's clock and would put
-- steps walked at 00:30 on the previous day.
create or replace function public.record_health_steps(p_day date, p_steps integer, p_source text, p_recorded_at timestamptz default now())
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_role()<>'client' then raise exception 'not_authorized'; end if;
  if p_source not in ('healthkit','health-connect','manual','test') then raise exception 'invalid_source'; end if;
  if p_steps is null or p_steps<0 or p_steps>200000 then raise exception 'invalid_steps'; end if;
  if p_day is null or p_day > (current_date + 1) then raise exception 'invalid_day'; end if;

  insert into public.health_steps(client_id, day, source, steps, recorded_at)
  values (auth.uid(), p_day, p_source, p_steps, coalesce(p_recorded_at, now()))
  on conflict (client_id, day, source) do update
    set steps = excluded.steps, recorded_at = excluded.recorded_at;

  insert into public.health_preferences(client_id, last_sync_at, last_sync_source)
  values (auth.uid(), coalesce(p_recorded_at, now()), p_source)
  on conflict (client_id) do update
    set last_sync_at = excluded.last_sync_at, last_sync_source = excluded.last_sync_source, updated_at = now();
end $$;

create or replace function public.set_daily_step_goal(p_goal integer)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_role()<>'client' then raise exception 'not_authorized'; end if;
  if p_goal is null or p_goal < 1000 or p_goal > 50000 then raise exception 'invalid_goal'; end if;
  insert into public.health_preferences(client_id, daily_step_goal)
  values (auth.uid(), p_goal)
  on conflict (client_id) do update set daily_step_goal = excluded.daily_step_goal, updated_at = now();
end $$;

revoke all on table public.health_steps, public.health_preferences from anon, authenticated;
grant select, insert, update on table public.health_steps, public.health_preferences to authenticated;
revoke all on function public.record_health_steps(date,integer,text,timestamptz), public.set_daily_step_goal(integer) from public;
grant execute on function public.record_health_steps(date,integer,text,timestamptz), public.set_daily_step_goal(integer) to authenticated;

commit;
