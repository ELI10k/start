begin;

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  description text,
  status public.menu_status not null default 'draft',
  calorie_target numeric(8,2) check (calorie_target is null or calorie_target > 0),
  protein_target numeric(8,2) check (protein_target is null or protein_target > 0),
  carbohydrate_target numeric(8,2) check (carbohydrate_target is null or carbohydrate_target > 0),
  fat_target numeric(8,2) check (fat_target is null or fat_target > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_plans_coach_status_idx on public.meal_plans(coach_id, status, updated_at desc);

alter table public.meals alter column menu_day_id drop not null;
alter table public.meals
  add column meal_plan_id uuid references public.meal_plans(id) on delete cascade,
  add column day_index smallint not null default 0 check (day_index between 0 and 6),
  add constraint meals_have_parent check (menu_day_id is not null or meal_plan_id is not null);
create index meals_plan_day_order_idx on public.meals(meal_plan_id, day_index, sort_order);

create table public.client_meal_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  status public.relationship_status not null default 'active',
  assigned_from date not null default current_date,
  assigned_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assigned_until is null or assigned_until >= assigned_from)
);
create unique index assignments_one_active_per_client_idx on public.client_meal_plan_assignments(client_id) where status = 'active';
create index assignments_plan_status_idx on public.client_meal_plan_assignments(meal_plan_id, status);
create index assignments_client_dates_idx on public.client_meal_plan_assignments(client_id, assigned_from, assigned_until);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.client_meal_plan_assignments(id) on delete set null,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  log_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, log_date)
);
create index nutrition_logs_client_date_idx on public.nutrition_logs(client_id, log_date desc);
create index nutrition_logs_plan_date_idx on public.nutrition_logs(meal_plan_id, log_date desc);

create table public.eaten_meal_items (
  id uuid primary key default gen_random_uuid(),
  nutrition_log_id uuid not null references public.nutrition_logs(id) on delete cascade,
  meal_item_id uuid references public.meal_items(id) on delete set null,
  food_id text references public.foods(id) on delete set null,
  food_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  calculated_calories numeric(10,2) not null check (calculated_calories >= 0),
  calculated_protein numeric(10,2) not null check (calculated_protein >= 0),
  calculated_carbohydrates numeric(10,2) not null check (calculated_carbohydrates >= 0),
  calculated_fat numeric(10,2) not null check (calculated_fat >= 0),
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index eaten_items_log_item_unique_idx on public.eaten_meal_items(nutrition_log_id, meal_item_id) where meal_item_id is not null;
create index eaten_items_log_idx on public.eaten_meal_items(nutrition_log_id, eaten_at);

create trigger meal_plans_touch before update on public.meal_plans for each row execute function public.touch_updated_at();
create trigger assignments_touch before update on public.client_meal_plan_assignments for each row execute function public.touch_updated_at();
create trigger nutrition_logs_touch before update on public.nutrition_logs for each row execute function public.touch_updated_at();

alter table public.meal_plans enable row level security;
alter table public.client_meal_plan_assignments enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.eaten_meal_items enable row level security;

create policy meal_plans_coach_all on public.meal_plans for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
create policy meal_plans_client_select on public.meal_plans for select to authenticated
  using (exists(
    select 1 from public.client_meal_plan_assignments a
    where a.meal_plan_id = id and a.client_id = (select auth.uid()) and a.status = 'active'
      and a.assigned_from <= current_date and (a.assigned_until is null or a.assigned_until >= current_date)
  ));

create policy meals_plan_visible on public.meals for select to authenticated
  using (meal_plan_id is not null and exists(
    select 1 from public.meal_plans p
    where p.id = meal_plan_id and (
      p.coach_id = (select auth.uid()) or exists(
        select 1 from public.client_meal_plan_assignments a
        where a.meal_plan_id = p.id and a.client_id = (select auth.uid()) and a.status = 'active'
          and a.assigned_from <= current_date and (a.assigned_until is null or a.assigned_until >= current_date)
      )
    )
  ));
create policy meals_plan_coach_write on public.meals for all to authenticated
  using (meal_plan_id is not null and exists(select 1 from public.meal_plans p where p.id = meal_plan_id and p.coach_id = (select auth.uid())))
  with check (meal_plan_id is not null and exists(select 1 from public.meal_plans p where p.id = meal_plan_id and p.coach_id = (select auth.uid())));

create policy meal_items_plan_visible on public.meal_items for select to authenticated
  using (exists(
    select 1 from public.meals m join public.meal_plans p on p.id = m.meal_plan_id
    where m.id = meal_id and (
      p.coach_id = (select auth.uid()) or exists(
        select 1 from public.client_meal_plan_assignments a
        where a.meal_plan_id = p.id and a.client_id = (select auth.uid()) and a.status = 'active'
          and a.assigned_from <= current_date and (a.assigned_until is null or a.assigned_until >= current_date)
      )
    )
  ));
create policy meal_items_plan_coach_write on public.meal_items for all to authenticated
  using (exists(select 1 from public.meals m join public.meal_plans p on p.id = m.meal_plan_id where m.id = meal_id and p.coach_id = (select auth.uid())))
  with check (exists(select 1 from public.meals m join public.meal_plans p on p.id = m.meal_plan_id where m.id = meal_id and p.coach_id = (select auth.uid())));

create policy assignments_participant_select on public.client_meal_plan_assignments for select to authenticated
  using (client_id = (select auth.uid()) or exists(select 1 from public.meal_plans p where p.id = meal_plan_id and p.coach_id = (select auth.uid())));
create policy assignments_coach_write on public.client_meal_plan_assignments for all to authenticated
  using (exists(select 1 from public.meal_plans p where p.id = meal_plan_id and p.coach_id = (select auth.uid())))
  with check (assigned_by = (select auth.uid()) and public.is_coach_for(client_id) and exists(select 1 from public.meal_plans p where p.id = meal_plan_id and p.coach_id = (select auth.uid())));

create policy nutrition_logs_self_all on public.nutrition_logs for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy nutrition_logs_coach_select on public.nutrition_logs for select to authenticated
  using (public.is_coach_for(client_id));
create policy eaten_items_self_all on public.eaten_meal_items for all to authenticated
  using (exists(select 1 from public.nutrition_logs l where l.id = nutrition_log_id and l.client_id = (select auth.uid())))
  with check (exists(select 1 from public.nutrition_logs l where l.id = nutrition_log_id and l.client_id = (select auth.uid())));
create policy eaten_items_coach_select on public.eaten_meal_items for select to authenticated
  using (exists(select 1 from public.nutrition_logs l where l.id = nutrition_log_id and public.is_coach_for(l.client_id)));

grant select on public.foods, public.meal_plans, public.meals, public.meal_items, public.client_meal_plan_assignments, public.nutrition_logs, public.eaten_meal_items to authenticated;
grant insert, update, delete on public.meal_plans, public.meals, public.meal_items, public.client_meal_plan_assignments, public.nutrition_logs, public.eaten_meal_items to authenticated;

create or replace function public.save_meal_plan_tree(p_plan jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_plan_id uuid := coalesce(nullif(p_plan->>'id','')::uuid, gen_random_uuid());
  v_client_id uuid := nullif(p_plan->>'clientId','')::uuid;
  v_status public.menu_status := coalesce(nullif(p_plan->>'status','')::public.menu_status, 'draft');
  v_day jsonb;
  v_meal jsonb;
  v_item jsonb;
  v_meal_id uuid;
  v_food public.foods;
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_plan->>'title',''))) = 0 then raise exception 'title_required'; end if;
  if v_client_id is not null and not public.is_coach_for(v_client_id) then raise exception 'client_not_assigned'; end if;
  if v_status = 'active' and v_client_id is null then raise exception 'active_menu_requires_client'; end if;

  insert into public.meal_plans(id, coach_id, title, description, status, calorie_target, protein_target, carbohydrate_target, fat_target)
  values(
    v_plan_id, auth.uid(), trim(p_plan->>'title'), nullif(p_plan->>'description',''), v_status,
    nullif(p_plan->>'calorieTarget','')::numeric, nullif(p_plan->>'proteinTarget','')::numeric,
    nullif(p_plan->>'carbohydrateTarget','')::numeric, nullif(p_plan->>'fatTarget','')::numeric
  )
  on conflict(id) do update set
    title = excluded.title, description = excluded.description, status = excluded.status,
    calorie_target = excluded.calorie_target, protein_target = excluded.protein_target,
    carbohydrate_target = excluded.carbohydrate_target, fat_target = excluded.fat_target
  where public.meal_plans.coach_id = auth.uid();
  if not found then raise exception 'meal_plan_not_owned'; end if;

  delete from public.meals where meal_plan_id = v_plan_id;
  for v_day in select * from jsonb_array_elements(coalesce(p_plan->'days','[]'::jsonb)) loop
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      if length(trim(coalesce(v_meal->>'title',''))) = 0 then raise exception 'meal_title_required'; end if;
      insert into public.meals(meal_plan_id, day_index, title, notes, sort_order)
      values(v_plan_id, coalesce((v_day->>'dayIndex')::smallint, 0), trim(v_meal->>'title'), nullif(v_meal->>'notes',''), coalesce((v_meal->>'sortOrder')::smallint,0))
      returning id into v_meal_id;
      for v_item in select * from jsonb_array_elements(coalesce(v_meal->'items','[]'::jsonb)) loop
        select * into v_food from public.foods where id = v_item->>'foodId';
        if not found then raise exception 'unknown_food:%', v_item->>'foodId'; end if;
        if (v_item->>'amount')::numeric <= 0 then raise exception 'invalid_amount'; end if;
        insert into public.meal_items(meal_id, food_id, amount, measurement_unit, calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat, sort_order)
        values(
          v_meal_id, v_food.id, (v_item->>'amount')::numeric, 'g',
          round(v_food.calories * (v_item->>'amount')::numeric / 100, 2),
          round(coalesce(v_food.protein,0) * (v_item->>'amount')::numeric / 100, 2),
          round(coalesce(v_food.carbs,0) * (v_item->>'amount')::numeric / 100, 2),
          round(coalesce(v_food.fat,0) * (v_item->>'amount')::numeric / 100, 2),
          coalesce((v_item->>'sortOrder')::smallint,0)
        );
      end loop;
    end loop;
  end loop;

  update public.client_meal_plan_assignments
  set status = 'ended', assigned_until = greatest(assigned_from, current_date), updated_at = now()
  where meal_plan_id = v_plan_id and status = 'active' and (v_status <> 'active' or client_id <> v_client_id);

  if v_status = 'active' then
    update public.meal_plans p set status = 'published'
    from public.client_meal_plan_assignments a
    where a.meal_plan_id = p.id and a.client_id = v_client_id and a.status = 'active' and p.id <> v_plan_id;
    update public.client_meal_plan_assignments
    set status = 'ended', assigned_until = greatest(assigned_from, current_date), updated_at = now()
    where client_id = v_client_id and status = 'active' and meal_plan_id <> v_plan_id;

    if exists(select 1 from public.client_meal_plan_assignments where client_id = v_client_id and meal_plan_id = v_plan_id and status = 'active') then
      update public.client_meal_plan_assignments
      set assigned_by = auth.uid(), assigned_from = coalesce(nullif(p_plan->>'activeFrom','')::date, current_date), assigned_until = nullif(p_plan->>'activeUntil','')::date, updated_at = now()
      where client_id = v_client_id and meal_plan_id = v_plan_id and status = 'active';
    else
      insert into public.client_meal_plan_assignments(meal_plan_id, client_id, assigned_by, assigned_from, assigned_until)
      values(v_plan_id, v_client_id, auth.uid(), coalesce(nullif(p_plan->>'activeFrom','')::date, current_date), nullif(p_plan->>'activeUntil','')::date);
    end if;
  end if;
  return v_plan_id;
end $$;

create or replace function public.set_meal_item_eaten(p_meal_item_id uuid, p_date date, p_eaten boolean) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_assignment public.client_meal_plan_assignments;
  v_item record;
  v_log_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  select a.* into v_assignment
  from public.client_meal_plan_assignments a
  join public.meals m on m.meal_plan_id = a.meal_plan_id
  join public.meal_items i on i.meal_id = m.id
  where i.id = p_meal_item_id and a.client_id = auth.uid() and a.status = 'active'
    and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date);
  if not found then raise exception 'meal_item_not_assigned'; end if;

  insert into public.nutrition_logs(client_id, assignment_id, meal_plan_id, log_date)
  values(auth.uid(), v_assignment.id, v_assignment.meal_plan_id, p_date)
  on conflict(client_id, log_date) do update set assignment_id = excluded.assignment_id, meal_plan_id = excluded.meal_plan_id
  returning id into v_log_id;

  if p_eaten then
    select i.*, f.name as food_name into v_item from public.meal_items i join public.foods f on f.id = i.food_id where i.id = p_meal_item_id;
    insert into public.eaten_meal_items(nutrition_log_id, meal_item_id, food_id, food_name, amount, calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat)
    values(v_log_id, v_item.id, v_item.food_id, v_item.food_name, v_item.amount, v_item.calculated_calories, v_item.calculated_protein, v_item.calculated_carbohydrates, v_item.calculated_fat)
    on conflict(nutrition_log_id, meal_item_id) where meal_item_id is not null do update set eaten_at = now();
  else
    delete from public.eaten_meal_items where nutrition_log_id = v_log_id and meal_item_id = p_meal_item_id;
  end if;
  return v_log_id;
end $$;

create or replace function public.set_meal_eaten(p_meal_id uuid, p_date date, p_eaten boolean) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_assignment public.client_meal_plan_assignments;
  v_log_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  select a.* into v_assignment
  from public.client_meal_plan_assignments a
  join public.meals m on m.meal_plan_id = a.meal_plan_id
  where m.id = p_meal_id and a.client_id = auth.uid() and a.status = 'active'
    and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date);
  if not found then raise exception 'meal_not_assigned'; end if;

  insert into public.nutrition_logs(client_id, assignment_id, meal_plan_id, log_date)
  values(auth.uid(), v_assignment.id, v_assignment.meal_plan_id, p_date)
  on conflict(client_id, log_date) do update set assignment_id = excluded.assignment_id, meal_plan_id = excluded.meal_plan_id
  returning id into v_log_id;

  if p_eaten then
    insert into public.eaten_meal_items(nutrition_log_id, meal_item_id, food_id, food_name, amount, calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat)
    select v_log_id, i.id, i.food_id, f.name, i.amount, i.calculated_calories, i.calculated_protein, i.calculated_carbohydrates, i.calculated_fat
    from public.meal_items i join public.foods f on f.id = i.food_id where i.meal_id = p_meal_id
    on conflict(nutrition_log_id, meal_item_id) where meal_item_id is not null do update set eaten_at = now();
  else
    delete from public.eaten_meal_items e using public.meal_items i
    where e.nutrition_log_id = v_log_id and e.meal_item_id = i.id and i.meal_id = p_meal_id;
  end if;
  return v_log_id;
end $$;

revoke all on function public.save_meal_plan_tree(jsonb) from public;
revoke all on function public.set_meal_item_eaten(uuid,date,boolean) from public;
revoke all on function public.set_meal_eaten(uuid,date,boolean) from public;
grant execute on function public.save_meal_plan_tree(jsonb) to authenticated;
grant execute on function public.set_meal_item_eaten(uuid,date,boolean) to authenticated;
grant execute on function public.set_meal_eaten(uuid,date,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
