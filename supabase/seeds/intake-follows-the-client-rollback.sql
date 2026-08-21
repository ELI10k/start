-- Undoes 202608210001_intake_follows_the_client.sql.
--
-- Restores the three functions to the definitions that shipped in
-- 202608190002 (set_meal_day_status), 202608200008 (set_meal_group_amount) and
-- 202607290003 (select_meal_group_alternative), and drops the two helpers.
--
-- Nothing stored has to be undone: the migration changed no table and wrote no
-- rows. Intake rows written while it was in force hold the portion the client
-- reported; after this they simply stop being kept in step.

begin;

create or replace function public.set_meal_day_status(
  p_meal_id uuid, p_date date, p_status text, p_note text default null
)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  v_assignment public.client_meal_plan_assignments;
  v_log_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_status not in ('eaten','not_eaten','other','none') then raise exception 'invalid_meal_status'; end if;
  if v_note is not null and p_status <> 'other' then raise exception 'note_requires_other_status'; end if;
  if p_status = 'other' and v_note is null then raise exception 'substitution_requires_note'; end if;
  if length(coalesce(v_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select a.* into v_assignment
  from public.client_meal_plan_assignments a
  join public.meals m on m.meal_plan_id = a.meal_plan_id
  where m.id = p_meal_id and a.client_id = auth.uid() and a.status = 'active'
    and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date);
  if not found then raise exception 'meal_not_assigned'; end if;

  insert into public.nutrition_logs(client_id, assignment_id, meal_plan_id, log_date)
  values (auth.uid(), v_assignment.id, v_assignment.meal_plan_id, p_date)
  on conflict (client_id, log_date) do update
    set assignment_id = excluded.assignment_id, meal_plan_id = excluded.meal_plan_id
  returning id into v_log_id;

  if p_status = 'eaten' then
    if exists(select 1 from public.meal_food_groups where meal_id = p_meal_id) and exists(
      select 1 from public.meal_food_groups g where g.meal_id = p_meal_id and not exists(
        select 1 from public.meal_group_selections s
        where s.client_id = auth.uid() and s.group_id = g.id and s.selection_date = p_date
      )
    ) then raise exception 'select_one_alternative_per_group'; end if;

    insert into public.eaten_meal_items(nutrition_log_id, meal_item_id, food_id, food_name, amount,
      calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat)
    select v_log_id, i.id, i.food_id, f.name, i.amount, i.calculated_calories, i.calculated_protein,
      i.calculated_carbohydrates, i.calculated_fat
    from public.meal_group_selections s
    join public.meal_items i on i.id = s.meal_item_id
    join public.foods f on f.id = i.food_id
    where s.client_id = auth.uid() and s.selection_date = p_date and i.meal_id = p_meal_id
    on conflict (nutrition_log_id, meal_item_id) where meal_item_id is not null
      do update set eaten_at = now();
  else
    delete from public.eaten_meal_items e
    using public.meal_items i
    where e.nutrition_log_id = v_log_id and e.meal_item_id = i.id and i.meal_id = p_meal_id;
  end if;

  if p_status = 'none' then
    delete from public.meal_day_status
    where client_id = auth.uid() and meal_id = p_meal_id and status_date = p_date;
  else
    insert into public.meal_day_status(client_id, meal_id, status_date, status, note)
    values (auth.uid(), p_meal_id, p_date, p_status, v_note)
    on conflict (client_id, meal_id, status_date)
      do update set status = excluded.status, note = excluded.note, updated_at = now();
  end if;

  return v_log_id;
end $$;

create or replace function public.set_meal_group_amount(p_group_id uuid, p_date date, p_quantity numeric)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_quantity is not null and p_quantity < 0 then raise exception 'invalid_quantity'; end if;

  if not exists(
    select 1 from public.meal_food_groups g
    join public.meals m on m.id = g.meal_id
    join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
    where g.id = p_group_id and a.client_id = auth.uid() and a.status = 'active'
      and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date)
  ) then raise exception 'group_not_assigned'; end if;

  update public.meal_group_selections
    set amount_override = p_quantity, updated_at = now()
    where client_id = auth.uid() and group_id = p_group_id and selection_date = p_date
    returning id into v_id;
  if v_id is null then raise exception 'select_one_alternative_per_group'; end if;
  return v_id;
end $$;

create or replace function public.select_meal_group_alternative(p_group_id uuid,p_meal_item_id uuid,p_date date) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role()<>'client' then raise exception 'client_required'; end if;
  if not exists(
    select 1 from public.meal_food_groups g join public.meal_items i on i.group_id=g.id
    join public.meals m on m.id=g.meal_id join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
    where g.id=p_group_id and i.id=p_meal_item_id and a.client_id=auth.uid() and a.status='active'
      and a.assigned_from<=p_date and (a.assigned_until is null or a.assigned_until>=p_date)
  ) then raise exception 'alternative_not_assigned'; end if;
  insert into public.meal_group_selections(client_id,group_id,meal_item_id,selection_date)
  values(auth.uid(),p_group_id,p_meal_item_id,p_date)
  on conflict(client_id,group_id,selection_date) do update set meal_item_id=excluded.meal_item_id,updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

drop function if exists public.refresh_meal_intake(uuid,date);
drop function if exists public.meal_item_intake_factor(numeric,numeric,numeric);

notify pgrst, 'reload schema';
commit;
