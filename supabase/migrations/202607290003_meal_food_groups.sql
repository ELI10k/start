begin;

alter table public.meals
  add column if not exists meal_type text,
  add column if not exists free_calorie_target numeric(8,2)
    check (free_calorie_target is null or free_calorie_target > 0);

create table if not exists public.meal_food_groups (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  group_type text not null check (group_type in ('protein','carbohydrate','fat','vegetables')),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique(meal_id,group_type)
);
alter table public.meal_items add column if not exists group_id uuid references public.meal_food_groups(id) on delete cascade;
create index if not exists meal_food_groups_meal_order_idx on public.meal_food_groups(meal_id,sort_order);
create index if not exists meal_items_group_order_idx on public.meal_items(group_id,sort_order);

create table if not exists public.meal_group_selections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.meal_food_groups(id) on delete cascade,
  meal_item_id uuid not null references public.meal_items(id) on delete cascade,
  selection_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id,group_id,selection_date)
);
create index if not exists meal_group_selections_client_date_idx on public.meal_group_selections(client_id,selection_date);

alter table public.meal_food_groups enable row level security;
alter table public.meal_group_selections enable row level security;

create policy meal_food_groups_visible on public.meal_food_groups for select to authenticated
using(exists(
  select 1 from public.meals m join public.meal_plans p on p.id=m.meal_plan_id
  where m.id=meal_id and (
    p.coach_id=(select auth.uid()) or exists(
      select 1 from public.client_meal_plan_assignments a
      where a.meal_plan_id=p.id and a.client_id=(select auth.uid()) and a.status='active'
        and a.assigned_from<=current_date and (a.assigned_until is null or a.assigned_until>=current_date)
    )
  )
));
create policy meal_food_groups_coach_write on public.meal_food_groups for all to authenticated
using(exists(select 1 from public.meals m join public.meal_plans p on p.id=m.meal_plan_id where m.id=meal_id and p.coach_id=(select auth.uid())))
with check(exists(select 1 from public.meals m join public.meal_plans p on p.id=m.meal_plan_id where m.id=meal_id and p.coach_id=(select auth.uid())));
create policy meal_group_selections_self on public.meal_group_selections for all to authenticated
using(client_id=(select auth.uid())) with check(client_id=(select auth.uid()));
create policy meal_group_selections_coach_select on public.meal_group_selections for select to authenticated
using(public.is_coach_for(client_id));

grant select,insert,update,delete on public.meal_food_groups,public.meal_group_selections to authenticated;

-- Preserve existing plans: every existing item becomes an alternative in a
-- deterministic group. Coaches can refine the classification after migration.
insert into public.meal_food_groups(meal_id,group_type,sort_order)
select m.id,'protein',0 from public.meals m
where m.meal_plan_id is not null and exists(select 1 from public.meal_items i where i.meal_id=m.id)
on conflict(meal_id,group_type) do nothing;
update public.meal_items i set group_id=g.id
from public.meal_food_groups g where g.meal_id=i.meal_id and g.group_type='protein' and i.group_id is null;

update public.meals set meal_type=case
  when title like '%בוקר%' then 'ארוחת בוקר'
  when title like '%צהריים%' then 'ארוחת צהריים'
  when title like '%ערב%' then 'ארוחת ערב'
  when title like '%ביניים%' then 'ארוחת ביניים 1'
  else 'ארוחת בוקר' end
where meal_plan_id is not null and meal_type is null;

with master_meals as(
  select m.id,m.sort_order from public.meals m join public.meal_plans p on p.id=m.meal_plan_id where p.is_system_template
), carb_groups as(
  insert into public.meal_food_groups(meal_id,group_type,sort_order)
  select id,'carbohydrate',1 from master_meals
  on conflict(meal_id,group_type) do update set sort_order=excluded.sort_order
  returning id,meal_id
), ranked as(
  select i.id,i.meal_id,row_number() over(partition by i.meal_id order by i.sort_order) as position,
    (select sort_order from master_meals where id=i.meal_id) as meal_position
  from public.meal_items i where i.meal_id in(select id from master_meals)
)
update public.meal_items i set group_id=c.id
from ranked r join carb_groups c on c.meal_id=r.meal_id
where i.id=r.id and r.position>case r.meal_position when 0 then 4 when 1 then 4 when 2 then 1 when 3 then 4 else 1 end;

update public.meals m set title=case m.sort_order when 0 then 'ארוחת בוקר' when 1 then 'ארוחת צהריים'
  when 2 then 'ארוחת ביניים 1' when 3 then 'ארוחת ערב' else m.title end,
  meal_type=case m.sort_order when 0 then 'ארוחת בוקר' when 1 then 'ארוחת צהריים'
  when 2 then 'ארוחת ביניים 1' when 3 then 'ארוחת ערב' else m.meal_type end
from public.meal_plans p where p.id=m.meal_plan_id and p.is_system_template;

insert into public.meals(meal_plan_id,day_index,title,meal_type,notes,free_calorie_target,sort_order)
select p.id,0,'קלוריות חופשיות','קלוריות חופשיות','המאמן הגדיר מסגרת קלורית חופשית לבחירת הלקוח.',300,5
from public.meal_plans p where p.is_system_template and not exists(
  select 1 from public.meals m where m.meal_plan_id=p.id and m.meal_type='קלוריות חופשיות'
);

create or replace function public.save_meal_plan_tree(p_plan jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  v_plan_id uuid:=coalesce(nullif(p_plan->>'id','')::uuid,gen_random_uuid());
  v_client_id uuid:=nullif(p_plan->>'clientId','')::uuid;
  v_status public.menu_status:=coalesce(nullif(p_plan->>'status','')::public.menu_status,'draft');
  v_day jsonb; v_meal jsonb; v_group jsonb; v_item jsonb;
  v_meal_id uuid; v_group_id uuid; v_food public.foods;
  v_title text;
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_plan->>'title','')))=0 then raise exception 'title_required'; end if;
  if v_client_id is not null and not public.is_coach_for(v_client_id) then raise exception 'client_not_assigned'; end if;
  if v_status='active' and v_client_id is null then raise exception 'active_menu_requires_client'; end if;
  insert into public.meal_plans(id,coach_id,title,description,status,calorie_target,protein_target,carbohydrate_target,fat_target)
  values(v_plan_id,auth.uid(),trim(p_plan->>'title'),nullif(p_plan->>'description',''),v_status,
    nullif(p_plan->>'calorieTarget','')::numeric,nullif(p_plan->>'proteinTarget','')::numeric,
    nullif(p_plan->>'carbohydrateTarget','')::numeric,nullif(p_plan->>'fatTarget','')::numeric)
  on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,
    calorie_target=excluded.calorie_target,protein_target=excluded.protein_target,
    carbohydrate_target=excluded.carbohydrate_target,fat_target=excluded.fat_target
  where public.meal_plans.coach_id=auth.uid();
  if not found then raise exception 'meal_plan_not_owned'; end if;
  delete from public.meals where meal_plan_id=v_plan_id;
  for v_day in select * from jsonb_array_elements(coalesce(p_plan->'days','[]'::jsonb)) loop
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      v_title:=v_meal->>'title';
      if v_title not in ('ארוחת בוקר','ארוחת ביניים 1','ארוחת צהריים','ארוחת ביניים 2','ארוחת ערב','קלוריות חופשיות') then raise exception 'invalid_meal_type'; end if;
      insert into public.meals(meal_plan_id,day_index,title,meal_type,notes,free_calorie_target,sort_order)
      values(v_plan_id,coalesce((v_day->>'dayIndex')::smallint,0),v_title,v_title,nullif(v_meal->>'notes',''),
        case when v_title='קלוריות חופשיות' then nullif(v_meal->>'freeCalorieTarget','')::numeric end,
        coalesce((v_meal->>'sortOrder')::smallint,0)) returning id into v_meal_id;
      if v_title<>'קלוריות חופשיות' then
        for v_group in select * from jsonb_array_elements(coalesce(v_meal->'groups','[]'::jsonb)) loop
          insert into public.meal_food_groups(meal_id,group_type,sort_order)
          values(v_meal_id,v_group->>'type',coalesce((v_group->>'sortOrder')::smallint,0)) returning id into v_group_id;
          for v_item in select * from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) loop
            select * into v_food from public.foods where id=v_item->>'foodId';
            if not found then raise exception 'unknown_food:%',v_item->>'foodId'; end if;
            if (v_item->>'amount')::numeric<=0 then raise exception 'invalid_amount'; end if;
            insert into public.meal_items(meal_id,group_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
            values(v_meal_id,v_group_id,v_food.id,(v_item->>'amount')::numeric,'g',
              round(v_food.calories*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.protein,0)*(v_item->>'amount')::numeric/100,2),
              round(coalesce(v_food.carbs,0)*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.fat,0)*(v_item->>'amount')::numeric/100,2),
              coalesce((v_item->>'sortOrder')::smallint,0));
          end loop;
        end loop;
      end if;
    end loop;
  end loop;
  update public.client_meal_plan_assignments set status='ended',assigned_until=greatest(assigned_from,current_date),updated_at=now()
    where meal_plan_id=v_plan_id and status='active' and (v_status<>'active' or client_id<>v_client_id);
  if v_status='active' then
    update public.meal_plans p set status='published' from public.client_meal_plan_assignments a
      where a.meal_plan_id=p.id and a.client_id=v_client_id and a.status='active' and p.id<>v_plan_id;
    update public.client_meal_plan_assignments set status='ended',assigned_until=greatest(assigned_from,current_date),updated_at=now()
      where client_id=v_client_id and status='active' and meal_plan_id<>v_plan_id;
    if exists(select 1 from public.client_meal_plan_assignments where client_id=v_client_id and meal_plan_id=v_plan_id and status='active') then
      update public.client_meal_plan_assignments set assigned_by=auth.uid(),assigned_from=coalesce(nullif(p_plan->>'activeFrom','')::date,current_date),assigned_until=nullif(p_plan->>'activeUntil','')::date,updated_at=now()
        where client_id=v_client_id and meal_plan_id=v_plan_id and status='active';
    else
      insert into public.client_meal_plan_assignments(meal_plan_id,client_id,assigned_by,assigned_from,assigned_until)
      values(v_plan_id,v_client_id,auth.uid(),coalesce(nullif(p_plan->>'activeFrom','')::date,current_date),nullif(p_plan->>'activeUntil','')::date);
    end if;
  end if;
  return v_plan_id;
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
revoke all on function public.select_meal_group_alternative(uuid,uuid,date) from public;
grant execute on function public.select_meal_group_alternative(uuid,uuid,date) to authenticated;

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

commit;
