begin;

-- The saved-menu screen intermittently died with 57014, "canceling statement due
-- to statement timeout", and only ever under concurrency. The queries are not
-- the problem: every one of them returns in under 400ms on its own, for a menu
-- with five meals and thirty-seven items.
--
-- The cost was in the row-level security, and it was paid three times over on
-- the two hottest tables.
--
-- public.meals and public.meal_items each carry two generations of permissive
-- policy. The current pair routes through meal_plans. The original pair, written
-- for the menus/menu_days schema that nothing has read for months, is still
-- installed. Postgres ORs permissive policies together, so every read of a meal
-- item evaluated both - and the legacy branch is a three-table join.
--
-- The legacy policies also call auth.uid() bare rather than as (select
-- auth.uid()). Bare, it is not treated as a stable initplan, so it is
-- re-evaluated per row instead of once per query; the current policies already
-- get this right. And they carry no `to authenticated`, so they were evaluated
-- for anon as well.
--
-- Dropping them removes a dead join, a per-row function call and an unnecessary
-- role from the hot path. No access changes: the plan-based policies grant the
-- coach who owns the plan and the client actively assigned to it, which is
-- exactly what the application reads.
--
-- Nothing in app/, lib/ or components/ references menus, menu_days or
-- menu_day_id. The tables and their own policies are left alone; only the two
-- pairs sitting on the tables the menu screen actually reads are retired.
--
-- Rollback: re-create the four policies from 202607200001_initial_product.sql
--           (meals_visible, meals_coach_write, meal_items_visible,
--           meal_items_coach_write). Access is unchanged either way, so a
--           rollback is only ever a performance decision.

drop policy if exists meals_visible on public.meals;
drop policy if exists meals_coach_write on public.meals;
drop policy if exists meal_items_visible on public.meal_items;
drop policy if exists meal_items_coach_write on public.meal_items;

-- The menu screen reads groups by meal_id and orders by sort_order; without this
-- the read is a sequential scan once a coach has a few hundred groups.
create index if not exists meal_food_groups_meal_order_idx
  on public.meal_food_groups(meal_id, sort_order);

-- Lets a verifier confirm from the outside which policies are actually
-- installed, rather than inferring it from the migration files. Service role
-- only: the policy list is a description of the security model.
create or replace function public.start_list_policies(p_tables text[])
returns table (tablename text, policyname text, cmd text, permissive text)
language sql stable security definer set search_path = public as $$
  select p.tablename::text, p.policyname::text, p.cmd::text, p.permissive::text
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = any(p_tables)
  order by p.tablename, p.policyname
$$;

revoke all on function public.start_list_policies(text[]) from public, anon, authenticated;

commit;
