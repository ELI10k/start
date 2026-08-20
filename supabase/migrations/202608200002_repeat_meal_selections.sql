-- "Same as yesterday."
--
-- Choosing an alternative in every group is the most repeated action in the
-- product. The choice is stored per day, so it is wiped at midnight and made
-- again every morning - and most days the client eats the same thing they ate
-- yesterday. A five-meal menu with four groups is twenty taps to say "the same".
--
-- This copies one day's choices onto another for the calling client. It is
-- deliberately additive: a group that already has a choice today is left alone,
-- so pressing it after choosing two meals by hand fills in the rest instead of
-- overwriting the two.
--
-- Safety is the same as select_meal_group_alternative and is checked the same
-- way: the group has to belong to a plan actively assigned to the caller on the
-- target date, and the item has to still belong to that group. A menu the coach
-- has edited since yesterday therefore copies only what still exists, and a
-- client cannot reach anyone else's rows - security invoker, under the existing
-- client-owns-their-selections policy.
--
-- Impact: no table or column changes. One new function.
-- Rollback: supabase/seeds/repeat-meal-selections-rollback.sql

begin;

create or replace function public.repeat_meal_group_selections(p_from date, p_to date)
returns integer
language plpgsql security invoker set search_path=public as $$
declare
  v_copied integer;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_from is null or p_to is null then raise exception 'dates_required'; end if;
  if p_from = p_to then raise exception 'same_day'; end if;

  insert into public.meal_group_selections(client_id, group_id, meal_item_id, selection_date)
  select source.client_id, source.group_id, source.meal_item_id, p_to
  from public.meal_group_selections source
  join public.meal_food_groups g on g.id = source.group_id
  join public.meal_items i on i.id = source.meal_item_id and i.group_id = g.id
  join public.meals m on m.id = g.meal_id
  join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
  where source.client_id = auth.uid()
    and source.selection_date = p_from
    and a.client_id = auth.uid()
    and a.status = 'active'
    and a.assigned_from <= p_to
    and (a.assigned_until is null or a.assigned_until >= p_to)
    -- A choice already made today is the client's and is not overwritten.
    and not exists(
      select 1 from public.meal_group_selections existing
      where existing.client_id = auth.uid()
        and existing.group_id = source.group_id
        and existing.selection_date = p_to
    )
  on conflict(client_id, group_id, selection_date) do nothing;

  get diagnostics v_copied = row_count;
  return v_copied;
end $$;

revoke all on function public.repeat_meal_group_selections(date,date) from public;
revoke all on function public.repeat_meal_group_selections(date,date) from anon;
grant execute on function public.repeat_meal_group_selections(date,date) to authenticated;

notify pgrst, 'reload schema';
commit;
