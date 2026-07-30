begin;

alter table public.meal_plans
  add column if not exists is_system_template boolean not null default false,
  add column if not exists protein_target_source text not null default 'manual'
    check (protein_target_source in ('auto','manual')),
  add column if not exists carbohydrate_target_source text not null default 'manual'
    check (carbohydrate_target_source in ('auto','manual')),
  add column if not exists fat_target_source text not null default 'manual'
    check (fat_target_source in ('auto','manual'));
create unique index if not exists meal_plans_one_start_master_per_coach
  on public.meal_plans(coach_id) where is_system_template;

create table public.coach_food_usage (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  food_id text not null references public.foods(id) on delete cascade,
  selection_count bigint not null default 0 check (selection_count >= 0),
  last_used_at timestamptz not null default now(),
  manual_favorite boolean not null default false,
  primary key(coach_id, food_id)
);
create index coach_food_usage_recent_idx on public.coach_food_usage(coach_id,last_used_at desc);
create index coach_food_usage_frequent_idx on public.coach_food_usage(coach_id,manual_favorite desc,selection_count desc,last_used_at desc);
alter table public.coach_food_usage enable row level security;
create policy coach_food_usage_owner_all on public.coach_food_usage for all to authenticated
  using (coach_id=(select auth.uid()) and public.current_role()='coach')
  with check (coach_id=(select auth.uid()) and public.current_role()='coach');
grant select,insert,update,delete on public.coach_food_usage to authenticated;

drop policy if exists meal_plans_coach_all on public.meal_plans;
create policy meal_plans_coach_select on public.meal_plans for select to authenticated
  using (coach_id=(select auth.uid()));
create policy meal_plans_coach_insert on public.meal_plans for insert to authenticated
  with check (coach_id=(select auth.uid()) and public.current_role()='coach');
create policy meal_plans_coach_update on public.meal_plans for update to authenticated
  using (coach_id=(select auth.uid()) and public.current_role()='coach')
  with check (coach_id=(select auth.uid()) and public.current_role()='coach');
create policy meal_plans_coach_delete on public.meal_plans for delete to authenticated
  using (coach_id=(select auth.uid()) and public.current_role()='coach' and not is_system_template);

create or replace function public.record_coach_food_selection(p_food_id text) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  if not exists(select 1 from public.foods where id=p_food_id) then raise exception 'food_not_found'; end if;
  insert into public.coach_food_usage(coach_id,food_id,selection_count,last_used_at)
  values(auth.uid(),p_food_id,1,now())
  on conflict(coach_id,food_id) do update set
    selection_count=public.coach_food_usage.selection_count+1,last_used_at=now();
end $$;
revoke all on function public.record_coach_food_selection(text) from public;
grant execute on function public.record_coach_food_selection(text) to authenticated;

create or replace function public.set_coach_food_favorite(p_food_id text,p_favorite boolean) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  insert into public.coach_food_usage(coach_id,food_id,selection_count,last_used_at,manual_favorite)
  values(auth.uid(),p_food_id,0,now(),p_favorite)
  on conflict(coach_id,food_id) do update set manual_favorite=p_favorite;
end $$;
revoke all on function public.set_coach_food_favorite(text,boolean) from public;
grant execute on function public.set_coach_food_favorite(text,boolean) to authenticated;

create or replace function public.ensure_start_master_menu(p_coach_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_plan uuid; v_meal uuid;
begin
  if not exists(select 1 from public.profiles where id=p_coach_id and role='coach') then return null; end if;
  select id into v_plan from public.meal_plans where coach_id=p_coach_id and is_system_template;
  if v_plan is not null then return v_plan; end if;
  insert into public.meal_plans(coach_id,title,description,status,calorie_target,is_system_template)
  values(p_coach_id,'תפריט מאסטר START','תבנית המערכת לפי טבלת START: בכל ארוחה מוצגות חלופות חלבון ופחמימה. יש לשכפל לפני שיוך ללקוח.','published',2250,true)
  returning id into v_plan;

  insert into public.meals(meal_plan_id,day_index,title,notes,sort_order)
  values(v_plan,0,'בוקר — חלופות חלבון','בחרו חלופת חלבון אחת וחלופת פחמימה אחת.',0) returning id into v_meal;
  insert into public.meal_items(meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
  select v_meal,f.id,x.amount,'g',round(f.calories*x.amount/100,2),round(coalesce(f.protein,0)*x.amount/100,2),round(coalesce(f.carbs,0)*x.amount/100,2),round(coalesce(f.fat,0)*x.amount/100,2),x.ord
  from (values('293',100::numeric,0),('298',100,1),('31',200,2),('127',100,3),('63',100,4),('70',100,5),('142',60,6)) x(id,amount,ord) join public.foods f on f.id=x.id;

  insert into public.meals(meal_plan_id,day_index,title,notes,sort_order)
  values(v_plan,0,'צהריים — חלופות חלבון ופחמימה','חלבון: 200 גרם עוף/פרגית/דג או 150 גרם קציצות. פחמימה: 200 גרם אורז/פתיתים/פסטה, 300 גרם תפוח אדמה/קינואה/בורגול, או 250 גרם בטטה/תפוח אדמה.',1) returning id into v_meal;
  insert into public.meal_items(meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
  select v_meal,f.id,x.amount,'g',round(f.calories*x.amount/100,2),round(coalesce(f.protein,0)*x.amount/100,2),round(coalesce(f.carbs,0)*x.amount/100,2),round(coalesce(f.fat,0)*x.amount/100,2),x.ord
  from (values('276',200::numeric,0),('278',200,1),('282',200,2),('121',200,3),('111',200,4),('124',300,5),('70',100,6)) x(id,amount,ord) join public.foods f on f.id=x.id;

  insert into public.meals(meal_plan_id,day_index,title,notes,sort_order)
  values(v_plan,0,'ביניים — 250 קלוריות','בחרו מנת חלבון אחת ומנת פחמימה אחת.',2) returning id into v_meal;
  insert into public.meal_items(meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
  select v_meal,f.id,x.amount,'g',round(f.calories*x.amount/100,2),round(coalesce(f.protein,0)*x.amount/100,2),round(coalesce(f.carbs,0)*x.amount/100,2),round(coalesce(f.fat,0)*x.amount/100,2),x.ord
  from (values('31',200::numeric,0),('63',60,1),('142',30,2)) x(id,amount,ord) join public.foods f on f.id=x.id;

  insert into public.meals(meal_plan_id,day_index,title,notes,sort_order)
  values(v_plan,0,'ערב — חלופות חלבון ופחמימה','כמו ארוחת הבוקר. ניתן להוסיף סלט חופשי.',3) returning id into v_meal;
  insert into public.meal_items(meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
  select v_meal,f.id,x.amount,'g',round(f.calories*x.amount/100,2),round(coalesce(f.protein,0)*x.amount/100,2),round(coalesce(f.carbs,0)*x.amount/100,2),round(coalesce(f.fat,0)*x.amount/100,2),x.ord
  from (values('293',100::numeric,0),('298',100,1),('31',200,2),('127',100,3),('63',100,4),('70',100,5),('142',60,6)) x(id,amount,ord) join public.foods f on f.id=x.id;
  return v_plan;
end $$;
revoke all on function public.ensure_start_master_menu(uuid) from public;

create or replace function public.ensure_start_master_for_new_coach() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.role='coach' then perform public.ensure_start_master_menu(new.id); end if;
  return new;
end $$;
create trigger profiles_start_master_menu after insert or update of role on public.profiles
for each row execute function public.ensure_start_master_for_new_coach();

select public.ensure_start_master_menu(id) from public.profiles where role='coach';

commit;
