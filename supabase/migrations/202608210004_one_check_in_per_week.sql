-- One check-in per week, because that is what a check-in is.
--
-- Nothing stopped a client filing the weekly update twice. A double tap on a slow
-- connection was enough, and the second row is not harmless: the photo cycle
-- counts check-ins, so every duplicate moves "photos required" a week out of
-- step, and the coach's queue shows the same week twice with no way to tell which
-- is the real one.
--
-- The window is the week, not the day. Every part of this instrument already says
-- so - the reminder is deduped on 'check-in-reminder-' || week and therefore
-- fires once a week, the form asks "how many days did you keep to the menu" with
-- a maximum of seven, and it asks how the WEEK went. A daily ceiling would permit
-- seven a week: a guard that does not guard the thing that matters.
--
-- Sunday to Saturday, matching weekStart() in the repository and the training
-- week both sides of the product already mean. Resolved in Israel time, so a
-- check-in filed at 00:30 belongs to the week the client thinks it does.
--
-- Enforced as a trigger rather than a unique index on purpose. The natural index
-- would be over an expression involving a time zone, and that is STABLE rather
-- than IMMUTABLE - Postgres will not index it. A trigger also needs no backfill,
-- so a client who already holds two rows in one week keeps both: this stops the
-- next one rather than passing judgement on history.
--
-- Impact: one trigger on inserts into check_ins, and two helper functions.
-- Nothing already stored is touched or re-validated. Updates are unaffected, so
-- a coach's review still writes normally.
--
-- Rollback: supabase/seeds/one-check-in-per-week-rollback.sql

begin;

-- The Sunday that opens the week a moment falls in, in Israel.
--
-- date_trunc('week') is ISO and opens on Monday, which is not the week either
-- side of this product means.
create or replace function public.israel_week_start(p_at timestamptz)
returns date
language sql stable set search_path = public as $$
  select (p_at at time zone 'Asia/Jerusalem')::date
       - extract(dow from (p_at at time zone 'Asia/Jerusalem')::date)::int
$$;

create or replace function public.check_ins_one_per_week()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists(
    select 1 from public.check_ins existing
    where existing.client_id = new.client_id
      and existing.id <> new.id
      and public.israel_week_start(existing.submitted_at)
        = public.israel_week_start(new.submitted_at)
  ) then
    raise exception 'check_in_already_this_week';
  end if;
  return new;
end $$;

drop trigger if exists check_ins_one_per_day_trigger on public.check_ins;
drop trigger if exists check_ins_one_per_week_trigger on public.check_ins;
create trigger check_ins_one_per_week_trigger
  before insert on public.check_ins
  for each row execute function public.check_ins_one_per_week();

-- Whether this week already has one, and when the next may be filed - so the
-- screen can say both on arrival rather than refusing after six steps.
create or replace function public.check_in_week_state()
returns table(submitted boolean, next_opens date)
language sql stable security invoker set search_path = public as $$
  select
    exists(
      select 1 from public.check_ins
      where client_id = auth.uid()
        and public.israel_week_start(submitted_at) = public.israel_week_start(now())
    ),
    public.israel_week_start(now()) + 7
$$;

-- The daily version of this guard was applied on 2026-08-21 before the rule was
-- settled. Its trigger is dropped above; its two functions go here, rather than
-- being left behind as a second, quieter answer to the same question.
drop function if exists public.check_ins_one_per_day();
drop function if exists public.check_in_submitted_today();

grant execute on function public.israel_week_start(timestamptz) to authenticated;
grant execute on function public.check_in_week_state() to authenticated;

notify pgrst, 'reload schema';
commit;
