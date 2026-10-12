begin;

create or replace function public.save_ai_meal_to_log(
  p_entry_id uuid, p_date date, p_meal_id uuid, p_meal_slot text,
  p_components jsonb, p_save_meal boolean default false, p_saved_meal_name text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_component jsonb; v_index integer:=0; v_existing integer; v_saved_meal_id uuid;
  v_food_id text; v_name text; v_grams numeric; v_calories numeric; v_protein numeric; v_carbs numeric; v_fat numeric;
  v_source text; v_per100 jsonb;
begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  if p_entry_id is null or p_date>(now() at time zone 'Asia/Jerusalem')::date then raise exception 'invalid_ai_meal';end if;
  if p_meal_slot not in ('breakfast','lunch','dinner','snack') then raise exception 'invalid_meal_slot';end if;
  if jsonb_typeof(p_components)<>'array' or jsonb_array_length(p_components)<1 or jsonb_array_length(p_components)>20 then raise exception 'invalid_components';end if;
  if p_meal_id is not null and not exists(
    select 1 from public.meals m join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
    where m.id=p_meal_id and a.client_id=auth.uid() and a.status='active'
  ) then raise exception 'meal_not_assigned';end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_entry_id::text,0));
  select count(*) into v_existing from public.client_food_log where client_id=auth.uid() and meal_entry_id=p_entry_id;
  if v_existing>0 then return jsonb_build_object('entryId',p_entry_id,'count',v_existing,'duplicate',true);end if;

  if p_save_meal then
    if length(btrim(coalesce(p_saved_meal_name,''))) not between 1 and 80 then raise exception 'invalid_saved_meal_name';end if;
    insert into public.my_meals(client_id,name) values(auth.uid(),btrim(p_saved_meal_name)) returning id into v_saved_meal_id;
  end if;

  for v_component in select value from jsonb_array_elements(p_components) loop
    v_food_id:=nullif(btrim(coalesce(v_component->>'foodId','')),'');
    v_name:=btrim(coalesce(v_component->>'name','')); v_grams:=nullif(v_component->>'grams','')::numeric;
    v_calories:=nullif(v_component->>'calories','')::numeric; v_protein:=nullif(v_component->>'protein','')::numeric;
    v_carbs:=nullif(v_component->>'carbs','')::numeric; v_fat:=nullif(v_component->>'fat','')::numeric;
    v_source:=v_component->>'nutritionSource'; v_per100:=v_component->'per100';
    if length(v_name) not between 1 and 200 or v_grams<=0 or v_grams>3000 or v_calories<0 or v_protein<0 or v_carbs<0 or v_fat<0 or v_source not in ('catalog','ai_estimate') then raise exception 'invalid_component';end if;
    if v_food_id is not null and not exists(select 1 from public.foods where id=v_food_id) then raise exception 'food_not_found';end if;
    insert into public.client_food_log(client_id,log_date,meal_id,food_id,name,quantity,unit,calories,protein,carbs,fat,source,eaten_at,meal_entry_id,meal_component_index,meal_slot,nutrition_source)
    values(auth.uid(),p_date,p_meal_id,v_food_id,v_name,v_grams,'גרם',v_calories,v_protein,v_carbs,v_fat,'photo',now(),p_entry_id,v_index,p_meal_slot,v_source);
    if v_saved_meal_id is not null then
      insert into public.my_meal_items(meal_id,food_id,quantity,unit,sort_order,snapshot_name,snapshot_calories,snapshot_protein,snapshot_carbs,snapshot_fat,nutrition_source)
      values(v_saved_meal_id,v_food_id,v_grams,'גרם',v_index,case when v_food_id is null then v_name end,
        case when v_food_id is null then (v_per100->>'calories')::numeric end,case when v_food_id is null then (v_per100->>'protein')::numeric end,
        case when v_food_id is null then (v_per100->>'carbs')::numeric end,case when v_food_id is null then (v_per100->>'fat')::numeric end,v_source);
    end if;
    v_index:=v_index+1;
  end loop;
  if p_meal_id is not null and not exists(
    select 1 from public.meal_day_status where client_id=auth.uid() and meal_id=p_meal_id and status_date=p_date
  ) then
    perform public.set_meal_day_status(p_meal_id,p_date,'other',left('ארוחה מצילום AI',500));
  end if;
  return jsonb_build_object('entryId',p_entry_id,'count',v_index,'duplicate',false,'savedMealId',v_saved_meal_id);
end$$;

revoke all on function public.save_ai_meal_to_log(uuid,date,uuid,text,jsonb,boolean,text) from public,anon;
grant execute on function public.save_ai_meal_to_log(uuid,date,uuid,text,jsonb,boolean,text) to authenticated;

notify pgrst,'reload schema';
commit;
