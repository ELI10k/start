-- The client's own menu, invisible to them for three hours every night.
--
-- Every write in the nutrition engine is dated by the app: `israelDateKey()`
-- goes into `save_meal_plan_tree` as `activeFrom`, and every RPC that records a
-- selection, an amount or a mark takes `p_date` and gates on
-- `a.assigned_from <= p_date`. Those are right.
--
-- The four SELECT policies that decide whether a client may read the plan at all
-- were not. They compare the assignment against bare `current_date`, and the
-- database runs in UTC while the product runs in Asia/Jerusalem - two or three
-- hours ahead. So between midnight and 03:00 Israel time, `current_date` is
-- still yesterday, and a menu activated for "today" fails
-- `assigned_from <= current_date` by exactly one day.
--
-- Observed on 2026-08-25 at 01:00 IDT: the client held one assignment, status
-- active, assigned_from 2026-08-25, and reading `meal_plans` as that client
-- returned nothing at all. The nutrition screen said "עדיין אין תפריט פעיל" to
-- somebody whose coach had just activated a menu for them.
--
-- The same three-hour window keeps a menu that ended yesterday readable, so the
-- client can be served the menu they are no longer on.
--
-- `public.israel_today()` is the day as the product reckons it, and is now what
-- the read side compares against. It is `stable`, so Postgres evaluates it once
-- per query rather than once per row - the same reason these policies already
-- wrap `auth.uid()` in a sub-select.
--
-- Impact: four SELECT policies and one helper function are replaced. No table,
-- column, index or grant changes. Access is unchanged for 21 hours of the day
-- and correct for the other three; nothing that was hidden from a client becomes
-- visible to them, because the assignment still has to be theirs and active.
-- The write path is untouched.
--
-- Backward compatible: the app already sends Israeli dates. Nothing needs to be
-- deployed with this, and nothing breaks if it is applied on its own.
--
-- Rollback: re-run the policy bodies from 202607200007_nutrition_persistence.sql
-- (meal_plans_client_select, meals_plan_visible, meal_items_plan_visible),
-- 202607290003_meal_food_groups.sql (meal_food_groups_visible) and
-- 202607270001_fix_nutrition_rls_recursion.sql
-- (has_active_meal_plan_assignment), each with `current_date` in place of
-- `public.israel_today()`, then `drop function public.israel_today()`.

begin;

-- The calendar day in the timezone every client of this product lives in.
create or replace function public.israel_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Asia/Jerusalem')::date
$$;

revoke all on function public.israel_today() from public, anon;
grant execute on function public.israel_today() to authenticated, service_role;

create or replace function public.has_active_meal_plan_assignment(target_meal_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_meal_plan_assignments assignment
    where assignment.meal_plan_id = target_meal_plan_id
      and assignment.client_id = auth.uid()
      and assignment.status = 'active'
      and assignment.assigned_from <= public.israel_today()
      and (assignment.assigned_until is null or assignment.assigned_until >= public.israel_today())
  )
$$;

drop policy if exists meal_plans_client_select on public.meal_plans;
create policy meal_plans_client_select on public.meal_plans for select to authenticated
  using (exists(
    select 1 from public.client_meal_plan_assignments a
    where a.meal_plan_id = id and a.client_id = (select auth.uid()) and a.status = 'active'
      and a.assigned_from <= public.israel_today()
      and (a.assigned_until is null or a.assigned_until >= public.israel_today())
  ));

drop policy if exists meals_plan_visible on public.meals;
create policy meals_plan_visible on public.meals for select to authenticated
  using (meal_plan_id is not null and exists(
    select 1 from public.meal_plans p
    where p.id = meal_plan_id and (
      p.coach_id = (select auth.uid()) or exists(
        select 1 from public.client_meal_plan_assignments a
        where a.meal_plan_id = p.id and a.client_id = (select auth.uid()) and a.status = 'active'
          and a.assigned_from <= public.israel_today()
          and (a.assigned_until is null or a.assigned_until >= public.israel_today())
      )
    )
  ));

drop policy if exists meal_items_plan_visible on public.meal_items;
create policy meal_items_plan_visible on public.meal_items for select to authenticated
  using (exists(
    select 1 from public.meals m join public.meal_plans p on p.id = m.meal_plan_id
    where m.id = meal_id and (
      p.coach_id = (select auth.uid()) or exists(
        select 1 from public.client_meal_plan_assignments a
        where a.meal_plan_id = p.id and a.client_id = (select auth.uid()) and a.status = 'active'
          and a.assigned_from <= public.israel_today()
          and (a.assigned_until is null or a.assigned_until >= public.israel_today())
      )
    )
  ));

drop policy if exists meal_food_groups_visible on public.meal_food_groups;
create policy meal_food_groups_visible on public.meal_food_groups for select to authenticated
  using (exists(
    select 1 from public.meals m join public.meal_plans p on p.id = m.meal_plan_id
    where m.id = meal_id and (
      p.coach_id = (select auth.uid()) or exists(
        select 1 from public.client_meal_plan_assignments a
        where a.meal_plan_id = p.id and a.client_id = (select auth.uid()) and a.status = 'active'
          and a.assigned_from <= public.israel_today()
          and (a.assigned_until is null or a.assigned_until >= public.israel_today())
      )
    )
  ));

notify pgrst,'reload schema';

commit;
