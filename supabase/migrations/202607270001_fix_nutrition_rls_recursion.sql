begin;

-- Keep cross-table authorization checks outside RLS policy evaluation.  The
-- previous policies queried each other (meal_plans -> assignments ->
-- meal_plans), which Postgres correctly rejected as recursive.
create or replace function public.is_meal_plan_coach(target_meal_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meal_plans plan
    where plan.id = target_meal_plan_id
      and plan.coach_id = auth.uid()
  )
$$;

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
      and assignment.assigned_from <= current_date
      and (assignment.assigned_until is null or assignment.assigned_until >= current_date)
  )
$$;

revoke all on function public.is_meal_plan_coach(uuid) from public;
revoke all on function public.has_active_meal_plan_assignment(uuid) from public;
grant execute on function public.is_meal_plan_coach(uuid) to authenticated;
grant execute on function public.has_active_meal_plan_assignment(uuid) to authenticated;

drop policy if exists meal_plans_client_select on public.meal_plans;
create policy meal_plans_client_select on public.meal_plans
  for select to authenticated
  using (public.has_active_meal_plan_assignment(id));

drop policy if exists assignments_participant_select on public.client_meal_plan_assignments;
create policy assignments_participant_select on public.client_meal_plan_assignments
  for select to authenticated
  using (client_id = (select auth.uid()) or public.is_meal_plan_coach(meal_plan_id));

drop policy if exists assignments_coach_write on public.client_meal_plan_assignments;
create policy assignments_coach_write on public.client_meal_plan_assignments
  for all to authenticated
  using (public.is_meal_plan_coach(meal_plan_id))
  with check (assigned_by = (select auth.uid()) and public.is_coach_for(client_id) and public.is_meal_plan_coach(meal_plan_id));

notify pgrst, 'reload schema';

commit;
