-- "The same as yesterday" means the same amount, too.
--
-- repeat_meal_group_selections fills today's empty groups with yesterday's
-- choices, and copies only the choice. A client who eats half a portion of
-- carbohydrate most days - which is exactly the client the override was built
-- for - got the food back and retyped the amount every morning, which is the
-- keystroke the button exists to remove.
--
-- The amount travels with the choice it belongs to, and only with it: the row is
-- copied whole or not at all, so an override can never land on a different food
-- from the one it was typed against.
--
-- Impact: one function replaced. One more column copied on rows that were
-- already being inserted. Groups already chosen today are still left alone.
--
-- Rollback: supabase/seeds/repeat-carries-the-amount-rollback.sql

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

  insert into public.meal_group_selections(client_id, group_id, meal_item_id, selection_date, amount_override)
  select source.client_id, source.group_id, source.meal_item_id, p_to, source.amount_override
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

notify pgrst, 'reload schema';
commit;
