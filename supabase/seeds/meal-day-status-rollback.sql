begin;

-- Rollback for 202608100001_meal_day_status.sql.
-- Restores set_meal_eaten to its previous standalone definition, drops the new
-- entry point, and removes the status table. Recorded statuses are lost; nothing
-- else is, because the table never held intake data.

create or replace function public.set_meal_eaten(p_meal_id uuid,p_date date,p_eaten boolean) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_assignment public.client_meal_plan_assignments; v_log_id uuid;
begin
  if public.current_role()<>'client' then raise exception 'client_required'; end if;
  select a.* into v_assignment from public.client_meal_plan_assignments a join public.meals m on m.meal_plan_id=a.meal_plan_id
  where m.id=p_meal_id and a.client_id=auth.uid() and a.status='active'
    and a.assigned_from<=p_date and (a.assigned_until is null or a.assigned_until>=p_date);
  if not found then raise exception 'meal_not_assigned'; end if;
  insert into public.nutrition_logs(client_id,assignment_id,meal_plan_id,log_date)
  values(auth.uid(),v_assignment.id,v_assignment.meal_plan_id,p_date)
  on conflict(client_id,log_date) do update set assignment_id=excluded.assignment_id,meal_plan_id=excluded.meal_plan_id returning id into v_log_id;
  if p_eaten then
    if exists(select 1 from public.meal_food_groups where meal_id=p_meal_id) and exists(
      select 1 from public.meal_food_groups g where g.meal_id=p_meal_id and not exists(
        select 1 from public.meal_group_selections s where s.client_id=auth.uid() and s.group_id=g.id and s.selection_date=p_date
      )
    ) then raise exception 'select_one_alternative_per_group'; end if;
    insert into public.eaten_meal_items(nutrition_log_id,meal_item_id,food_id,food_name,amount,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat)
    select v_log_id,i.id,i.food_id,f.name,i.amount,i.calculated_calories,i.calculated_protein,i.calculated_carbohydrates,i.calculated_fat
    from public.meal_group_selections s join public.meal_items i on i.id=s.meal_item_id join public.foods f on f.id=i.food_id
    where s.client_id=auth.uid() and s.selection_date=p_date and i.meal_id=p_meal_id
    on conflict(nutrition_log_id,meal_item_id) where meal_item_id is not null do update set eaten_at=now();
  else
    delete from public.eaten_meal_items e using public.meal_items i where e.nutrition_log_id=v_log_id and e.meal_item_id=i.id and i.meal_id=p_meal_id;
  end if;
  return v_log_id;
end $$;

drop function if exists public.set_meal_day_status(uuid,date,text);
drop table if exists public.meal_day_status;

commit;
