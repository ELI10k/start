-- Restores meal_plans_client_select to the function it is supposed to call.
--
-- 202608250010 corrected the timezone these policies compare against, and while
-- doing it rewrote meal_plans_client_select from the wrong source. It took the
-- inline body from 202607200007_nutrition_persistence.sql, which is the original
-- - and 202607270001_fix_nutrition_rls_recursion.sql had already replaced that
-- body precisely because it does not work.
--
-- Two things are wrong with the inline form:
--
--   * it reads public.client_meal_plan_assignments from inside a policy on
--     public.meal_plans, and the policy on assignments reads meal_plans back.
--     Postgres rejects the cycle. That is what "fix_nutrition_rls_recursion"
--     was named after.
--   * `a.meal_plan_id = id` leaves `id` unqualified inside a subquery whose own
--     table also has an `id`, so it binds to the assignment's own primary key
--     rather than to the plan's.
--
-- public.has_active_meal_plan_assignment is security definer, so it steps
-- outside RLS for that one lookup and takes the plan id as an argument, which
-- both problems disappear against. 202608250010 already updated the function
-- itself to use public.israel_today(); nothing about the date changes here.
--
-- Measured on the live database at 18:31 IDT on 2026-08-25, as the client:
--   israel_today()                    -> 2026-08-25
--   has_active_meal_plan_assignment() -> true
--   select from meal_plans            -> no row
-- The date was right and the policy was refusing anyway. meals, meal_items and
-- meal_food_groups all read meal_plans from inside their own policies, so all
-- three went dark with it, and the client's nutrition screen said "עדיין אין
-- תפריט פעיל" for the whole day rather than only after midnight.
--
-- The other three policies 202608250010 rewrote are unaffected: they were
-- already the live versions, they qualify every column, and they reach
-- assignments through meal_plans rather than in parallel with it.
--
-- Impact: one SELECT policy on public.meal_plans is replaced. No table, column,
-- index, grant or function changes. This restores the access that existed
-- before 202608250001, now on the Israeli calendar day.
--
-- Rollback: none wanted - the state this replaces denies every client their own
-- menu. To go back regardless, re-run the inline body from
-- 202608250010_the_menu_is_read_on_the_israeli_day.sql.

begin;

drop policy if exists meal_plans_client_select on public.meal_plans;
create policy meal_plans_client_select on public.meal_plans
  for select to authenticated
  using (public.has_active_meal_plan_assignment(id));

notify pgrst,'reload schema';

commit;
