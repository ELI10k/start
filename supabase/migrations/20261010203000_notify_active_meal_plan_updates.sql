-- An existing active meal plan keeps the same assignment row when a coach
-- edits it. The assignment notification trigger therefore sees no transition
-- and the client is never told that the plan changed.
--
-- Notify from the plan update itself, but only when the same intended client
-- already has this plan actively assigned. New activations are still handled
-- by notify_meal_plan_assignment after the assignment row is inserted.

begin;

create or replace function public.notify_active_meal_plan_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.client_meal_plan_assignments;
begin
  if new.status <> 'active' or new.intended_client_id is null then
    return new;
  end if;

  select assignment.* into v_assignment
  from public.client_meal_plan_assignments assignment
  where assignment.meal_plan_id = new.id
    and assignment.client_id = new.intended_client_id
    and assignment.status = 'active'
  limit 1;

  if found then
    perform public.create_in_app_notification(
      v_assignment.client_id,
      auth.uid(),
      'nutrition',
      'meal_plan_assigned',
      'התפריט שלך עודכן',
      coalesce(nullif(trim(new.title), ''), 'התפריט המעודכן מוכן לצפייה.'),
      '/nutrition',
      'meal_plans',
      new.id::text,
      'meal-plan-update-' || v_assignment.id::text || '-' || txid_current()::text
    );
  end if;

  return new;
end $$;

drop trigger if exists meal_plans_notify_active_update on public.meal_plans;
create trigger meal_plans_notify_active_update
  after update on public.meal_plans
  for each row execute function public.notify_active_meal_plan_update();

revoke all on function public.notify_active_meal_plan_update() from public, anon, authenticated;

commit;
