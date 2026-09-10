begin;

create or replace function public.save_meal_draft(
  p_meal_id uuid,
  p_date date,
  p_groups jsonb,
  p_status text default 'eaten'
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  v_group jsonb;
  v_group_id uuid;
  v_item_id uuid;
  v_quantity numeric;
  v_missing record;
  v_log_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_status <> 'eaten' then raise exception 'invalid_meal_status'; end if;
  if jsonb_typeof(p_groups) <> 'array'
     or jsonb_array_length(p_groups) > 20 then raise exception 'invalid_meal_draft'; end if;

  if not exists (
    select 1 from public.meals m
    join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
    where m.id=p_meal_id and a.client_id=auth.uid() and a.status='active'
      and a.assigned_from<=p_date and (a.assigned_until is null or a.assigned_until>=p_date)
  ) then raise exception 'meal_not_assigned'; end if;

  delete from public.meal_group_selections s
  using public.meal_food_groups g
  where s.client_id=auth.uid() and s.selection_date=p_date
    and s.group_id=g.id and g.meal_id=p_meal_id;

  for v_group in select value from jsonb_array_elements(p_groups)
  loop
    begin
      v_group_id := (v_group->>'groupId')::uuid;
      v_item_id := (v_group->>'itemId')::uuid;
      v_quantity := (v_group->>'quantity')::numeric;
    exception when others then
      raise exception 'invalid_meal_draft';
    end;
    if v_quantity < 0 then raise exception 'invalid_quantity'; end if;
    if not exists (
      select 1 from public.meal_food_groups g
      join public.meal_items i on i.group_id=g.id
      where g.id=v_group_id and g.meal_id=p_meal_id and i.id=v_item_id
    ) then raise exception 'alternative_not_assigned'; end if;
    perform public.select_meal_group_alternative(v_group_id,v_item_id,p_date);
    perform public.set_meal_group_amount(v_group_id,p_date,v_quantity);
  end loop;

  -- The legacy status function requires one row per group. Missing groups are
  -- represented by their primary item at zero, so a client can truthfully eat
  -- only protein or only carbohydrate without adding phantom calories.
  for v_missing in
    select g.id as group_id,
      (select i.id from public.meal_items i where i.group_id=g.id
       order by (i.item_role='primary') desc, i.sort_order, i.id limit 1) as item_id
    from public.meal_food_groups g
    where g.meal_id=p_meal_id and not exists (
      select 1 from public.meal_group_selections s
      where s.client_id=auth.uid() and s.selection_date=p_date and s.group_id=g.id
    )
  loop
    if v_missing.item_id is null then raise exception 'meal_group_has_no_food'; end if;
    perform public.select_meal_group_alternative(v_missing.group_id,v_missing.item_id,p_date);
    perform public.set_meal_group_amount(v_missing.group_id,p_date,0);
  end loop;

  v_log_id := public.set_meal_day_status(p_meal_id,p_date,p_status,null);
  return v_log_id;
end $$;

revoke all on function public.save_meal_draft(uuid,date,jsonb,text) from public;
revoke all on function public.save_meal_draft(uuid,date,jsonb,text) from anon;
grant execute on function public.save_meal_draft(uuid,date,jsonb,text) to authenticated;

notify pgrst, 'reload schema';
commit;
