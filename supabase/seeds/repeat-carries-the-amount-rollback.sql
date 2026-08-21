-- Undoes 202608210003 by restoring the 202608200002 definition, which copies the
-- choice without the amount. Nothing stored has to be undone: overrides copied
-- while it was in force are ordinary overrides and the client can clear any of
-- them from the screen.

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

notify pgrst, 'reload schema';
commit;
