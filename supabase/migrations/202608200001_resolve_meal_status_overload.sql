-- One signature for set_meal_day_status.
--
-- 202608190002 added a four-argument version whose last parameter has a default,
-- and kept the original three-argument one beside it "so existing callers keep
-- working". Those two are ambiguous to PostgreSQL: a call with three arguments
-- matches both candidates exactly, and the resolver cannot choose - it raises
-- `function set_meal_day_status(uuid, date, text) is not unique`.
--
-- The one caller that reaches it that way is set_meal_eaten, which is why this
-- has not been seen: no screen in the product calls set_meal_eaten, and the
-- application always sends four arguments. It is a trap laid for the next person
-- rather than a fault in front of a client, and it is removed here rather than
-- documented.
--
-- What changes: set_meal_eaten passes the fourth argument explicitly, and the
-- redundant three-argument wrapper is dropped. Nothing loses a capability - the
-- four-argument version accepts three-argument calls through its default, and
-- PostgREST fills defaults for named-argument calls, so an older deployment
-- posting {p_meal_id, p_date, p_status} still resolves.
--
-- Impact: no table, column, policy or row is touched. Two function definitions.
-- Rollback: supabase/seeds/meal-status-overload-rollback.sql

begin;

-- Explicit fourth argument: there is no longer a three-argument function to be
-- confused with, and there never should be again.
create or replace function public.set_meal_eaten(p_meal_id uuid, p_date date, p_eaten boolean)
returns uuid
language plpgsql security invoker set search_path=public as $$
begin
  return public.set_meal_day_status(p_meal_id, p_date, case when p_eaten then 'eaten' else 'none' end, null);
end $$;

drop function if exists public.set_meal_day_status(uuid, date, text);

notify pgrst, 'reload schema';
commit;
