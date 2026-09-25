begin;

-- A coach may phrase a catalogue food differently inside one menu without
-- renaming the shared catalogue row for every coach and client.

alter table public.meal_items
  add column if not exists custom_name text
  check (custom_name is null or length(btrim(custom_name)) between 1 and 200);

create or replace function public.apply_meal_item_custom_names(
  p_plan_id uuid,
  p_names jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if not exists (
    select 1 from public.meal_plans
    where id = p_plan_id and coach_id = auth.uid()
  ) then raise exception 'meal_plan_not_owned'; end if;

  update public.meal_items i
  set custom_name = nullif(btrim(n.value->>'customName'), '')
  from public.meals m
  join public.meal_food_groups g on g.meal_id = m.id
  join jsonb_array_elements(coalesce(p_names, '[]'::jsonb)) n(value)
    on (n.value->>'dayIndex')::smallint = m.day_index
   and (n.value->>'mealSortOrder')::smallint = m.sort_order
   and (n.value->>'groupSortOrder')::smallint = g.sort_order
  where i.meal_id = m.id
    and i.group_id = g.id
    and i.sort_order = (n.value->>'itemSortOrder')::smallint
    and m.meal_plan_id = p_plan_id;
end
$function$;

grant execute on function public.apply_meal_item_custom_names(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
