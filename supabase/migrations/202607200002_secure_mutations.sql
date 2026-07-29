begin;

create or replace function public.protect_profile_authority() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.role <> old.role or new.status <> old.status or new.id <> old.id) then raise exception 'profile_authority_fields_are_server_managed'; end if;
  return new;
end $$;
create trigger profiles_protect_authority before update on public.profiles for each row execute function public.protect_profile_authority();

create or replace function public.save_menu_tree(p_menu jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_menu_id uuid := coalesce(nullif(p_menu->>'id','')::uuid, gen_random_uuid());
  v_client_id uuid := nullif(p_menu->>'clientId','')::uuid;
  v_status public.menu_status := coalesce(nullif(p_menu->>'status','')::public.menu_status, 'draft');
  v_day jsonb; v_meal jsonb; v_item jsonb; v_day_id uuid; v_meal_id uuid; v_food public.foods;
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_menu->>'title',''))) = 0 then raise exception 'title_required'; end if;
  if v_client_id is not null and not public.is_coach_for(v_client_id) then raise exception 'client_not_assigned'; end if;
  if v_status = 'active' and v_client_id is null then raise exception 'active_menu_requires_client'; end if;
  if v_status = 'active' then update public.menus set status = 'published' where client_id = v_client_id and status = 'active' and id <> v_menu_id; end if;
  insert into public.menus(id, coach_id, client_id, title, description, status, calorie_target, protein_target, carbohydrate_target, fat_target, active_from, active_until)
  values(v_menu_id, auth.uid(), v_client_id, trim(p_menu->>'title'), nullif(p_menu->>'description',''), v_status,
    nullif(p_menu->>'calorieTarget','')::numeric, nullif(p_menu->>'proteinTarget','')::numeric,
    nullif(p_menu->>'carbohydrateTarget','')::numeric, nullif(p_menu->>'fatTarget','')::numeric,
    nullif(p_menu->>'activeFrom','')::date, nullif(p_menu->>'activeUntil','')::date)
  on conflict(id) do update set client_id=excluded.client_id,title=excluded.title,description=excluded.description,status=excluded.status,
    calorie_target=excluded.calorie_target,protein_target=excluded.protein_target,carbohydrate_target=excluded.carbohydrate_target,
    fat_target=excluded.fat_target,active_from=excluded.active_from,active_until=excluded.active_until
  where public.menus.coach_id = auth.uid();
  if not found then raise exception 'menu_not_owned'; end if;
  delete from public.menu_days where menu_id = v_menu_id;
  for v_day in select * from jsonb_array_elements(coalesce(p_menu->'days','[]'::jsonb)) loop
    insert into public.menu_days(menu_id,day_index,title,sort_order) values(v_menu_id,(v_day->>'dayIndex')::smallint,nullif(v_day->>'title',''),coalesce((v_day->>'sortOrder')::smallint,0)) returning id into v_day_id;
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      insert into public.meals(menu_day_id,title,notes,sort_order) values(v_day_id,trim(v_meal->>'title'),nullif(v_meal->>'notes',''),coalesce((v_meal->>'sortOrder')::smallint,0)) returning id into v_meal_id;
      for v_item in select * from jsonb_array_elements(coalesce(v_meal->'items','[]'::jsonb)) loop
        select * into v_food from public.foods where id = v_item->>'foodId';
        if not found then raise exception 'unknown_food:%', v_item->>'foodId'; end if;
        if (v_item->>'amount')::numeric <= 0 then raise exception 'invalid_amount'; end if;
        insert into public.meal_items(meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
        values(v_meal_id,v_food.id,(v_item->>'amount')::numeric,'g',
          round(v_food.calories*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.protein,0)*(v_item->>'amount')::numeric/100,2),
          round(coalesce(v_food.carbs,0)*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.fat,0)*(v_item->>'amount')::numeric/100,2),coalesce((v_item->>'sortOrder')::smallint,0));
      end loop;
    end loop;
  end loop;
  return v_menu_id;
end $$;
revoke all on function public.save_menu_tree(jsonb) from public;
grant execute on function public.save_menu_tree(jsonb) to authenticated;

create or replace function public.set_meal_completion(p_meal_id uuid, p_date date, p_completed boolean) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if not exists(select 1 from public.meals x join public.menu_days d on d.id=x.menu_day_id join public.menus m on m.id=d.menu_id where x.id=p_meal_id and m.client_id=auth.uid() and m.status='active') then raise exception 'meal_not_assigned'; end if;
  insert into public.meal_completion_logs(client_id,meal_id,completion_date,completed_at,status)
  values(auth.uid(),p_meal_id,p_date,case when p_completed then now() else null end,case when p_completed then 'completed' else 'undone' end)
  on conflict(client_id,meal_id,completion_date) do update set completed_at=excluded.completed_at,status=excluded.status returning id into v_id;
  return v_id;
end $$;
revoke all on function public.set_meal_completion(uuid,date,boolean) from public;
grant execute on function public.set_meal_completion(uuid,date,boolean) to authenticated;

commit;
