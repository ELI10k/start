-- Store the daily sleep duration read from Apple Health alongside steps.
-- The client owns its records and its coach receives read-only access.
-- Rollback: drop function public.record_health_sleep(date,integer,text,timestamptz);
--           drop table public.health_sleep;

begin;

create table if not exists public.health_sleep (
  client_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  source text not null check (source in ('healthkit', 'health-connect', 'manual', 'test')),
  minutes integer not null check (minutes >= 0 and minutes <= 1440),
  recorded_at timestamptz not null default now(),
  primary key (client_id, day, source)
);

create index if not exists health_sleep_client_day_idx on public.health_sleep (client_id, day desc);

alter table public.health_sleep enable row level security;

drop policy if exists health_sleep_client_all on public.health_sleep;
create policy health_sleep_client_all on public.health_sleep
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

drop policy if exists health_sleep_coach_read on public.health_sleep;
create policy health_sleep_coach_read on public.health_sleep
  for select to authenticated
  using ((select public.is_coach_for(client_id)));

create or replace function public.record_health_sleep(
  p_day date,
  p_minutes integer,
  p_source text,
  p_recorded_at timestamptz default now()
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_role()<>'client' then raise exception 'not_authorized'; end if;
  if p_source not in ('healthkit','health-connect','manual','test') then raise exception 'invalid_source'; end if;
  if p_minutes is null or p_minutes<0 or p_minutes>1440 then raise exception 'invalid_sleep'; end if;
  if p_day is null or p_day > (current_date + 1) then raise exception 'invalid_day'; end if;

  insert into public.health_sleep(client_id, day, source, minutes, recorded_at)
  values ((select auth.uid()), p_day, p_source, p_minutes, coalesce(p_recorded_at, now()))
  on conflict (client_id, day, source) do update
    set minutes = excluded.minutes, recorded_at = excluded.recorded_at;
end $$;

revoke all on table public.health_sleep from anon, authenticated;
grant select, insert, update on table public.health_sleep to authenticated;
revoke all on function public.record_health_sleep(date,integer,text,timestamptz) from public;
grant execute on function public.record_health_sleep(date,integer,text,timestamptz) to authenticated;

commit;
