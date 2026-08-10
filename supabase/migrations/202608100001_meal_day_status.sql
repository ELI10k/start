begin;

-- A meal has three states for a client on a given day: unmarked, eaten, and not
-- eaten. Until now only "eaten" existed, and it was inferred from the presence of
-- rows in eaten_meal_items. That inference has two consequences this migration
-- removes:
--
--   1. A meal with no food groups - the free-calorie meal - has no items to
--      infer from, so it could never be marked eaten. The write succeeded and
--      the screen never changed.
--   2. There was no way to say "I skipped this", so a coach could not tell an
--      unmarked meal from a deliberately skipped one.
--
-- The status is recorded explicitly. Macros are untouched by it: "not eaten"
-- writes no eaten_meal_items, so it cannot contribute to actual intake.

create table if not exists public.meal_day_status (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  status_date date not null,
  status text not null check (status in ('eaten','not_eaten')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, meal_id, status_date)
);

create index if not exists meal_day_status_client_date_idx
  on public.meal_day_status (client_id, status_date);

alter table public.meal_day_status enable row level security;

drop policy if exists meal_day_status_client_all on public.meal_day_status;
create policy meal_day_status_client_all on public.meal_day_status
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

-- A coach sees the status of their own clients, and cannot write it.
drop policy if exists meal_day_status_coach_read on public.meal_day_status;
create policy meal_day_status_coach_read on public.meal_day_status
  for select to authenticated
  using (public.is_coach_for(client_id));

-- One entry point for all three states. 'none' clears the mark entirely.
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
    -- Unchanged rule: every group must have a chosen alternative first.
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
    -- Both 'not_eaten' and 'none' remove any recorded intake for the meal, so a
    -- skipped meal can never contribute calories.
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

-- The original entry point stays, so nothing that calls it has to change; it is
-- now a thin wrapper that also records the explicit status.
create or replace function public.set_meal_eaten(p_meal_id uuid, p_date date, p_eaten boolean)
returns uuid
language plpgsql security invoker set search_path=public as $$
begin
  return public.set_meal_day_status(p_meal_id, p_date, case when p_eaten then 'eaten' else 'none' end);
end $$;

revoke all on function public.set_meal_day_status(uuid,date,text) from public;
revoke all on function public.set_meal_day_status(uuid,date,text) from anon;
grant execute on function public.set_meal_day_status(uuid,date,text) to authenticated;

commit;
