-- Rollback for 202608190002_meal_substituted_status.sql.
--
-- The substituted rows are deleted rather than converted. Rewriting them to
-- 'not_eaten' would put back exactly the false signal the migration set out to
-- remove, and an unmarked meal is the honest reading of a state this schema can
-- no longer express.

begin;

drop function if exists public.set_meal_day_status(uuid, date, text, text);

delete from public.meal_day_status where status = 'other';

alter table public.meal_day_status drop column if exists note;

alter table public.meal_day_status drop constraint if exists meal_day_status_status_check;
alter table public.meal_day_status
  add constraint meal_day_status_status_check check (status in ('eaten', 'not_eaten'));

create or replace function public.set_meal_day_status(p_meal_id uuid, p_date date, p_status text)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  v_assignment public.client_meal_plan_assignments;
  v_log_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_status not in ('eaten','not_eaten','none') then raise exception 'invalid_meal_status'; end if;

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
    insert into public.meal_day_status(client_id, meal_id, status_date, status)
    values (auth.uid(), p_meal_id, p_date, p_status)
    on conflict (client_id, meal_id, status_date)
      do update set status = excluded.status, updated_at = now();
  end if;

  return v_log_id;
end $$;

notify pgrst, 'reload schema';
commit;
