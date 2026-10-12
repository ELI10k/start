begin;

alter table public.client_food_log
  add column if not exists meal_entry_id uuid,
  add column if not exists meal_component_index smallint,
  add column if not exists meal_slot text,
  add column if not exists nutrition_source text;

alter table public.client_food_log drop constraint if exists client_food_log_meal_component_check;
alter table public.client_food_log add constraint client_food_log_meal_component_check check (
  (meal_entry_id is null and meal_component_index is null)
  or (meal_entry_id is not null and meal_component_index between 0 and 19)
);
alter table public.client_food_log drop constraint if exists client_food_log_meal_slot_check;
alter table public.client_food_log add constraint client_food_log_meal_slot_check check (meal_slot is null or meal_slot in ('breakfast','lunch','dinner','snack'));
alter table public.client_food_log drop constraint if exists client_food_log_nutrition_source_check;
alter table public.client_food_log add constraint client_food_log_nutrition_source_check check (nutrition_source is null or nutrition_source in ('catalog','ai_estimate','manual'));
create unique index if not exists client_food_log_ai_meal_component_unique
  on public.client_food_log(client_id,meal_entry_id,meal_component_index) where meal_entry_id is not null;

alter table public.my_meal_items alter column food_id drop not null;
alter table public.my_meal_items
  add column if not exists snapshot_name text,
  add column if not exists snapshot_calories numeric(8,2),
  add column if not exists snapshot_protein numeric(8,2),
  add column if not exists snapshot_carbs numeric(8,2),
  add column if not exists snapshot_fat numeric(8,2),
  add column if not exists nutrition_source text;
alter table public.my_meal_items drop constraint if exists my_meal_items_food_or_snapshot_check;
alter table public.my_meal_items add constraint my_meal_items_food_or_snapshot_check check (
  food_id is not null or (
    length(btrim(coalesce(snapshot_name,''))) between 1 and 200
    and coalesce(snapshot_calories,-1) between 0 and 900
    and coalesce(snapshot_protein,-1) between 0 and 100
    and coalesce(snapshot_carbs,-1) between 0 and 100
    and coalesce(snapshot_fat,-1) between 0 and 100
  )
);
alter table public.my_meal_items drop constraint if exists my_meal_items_nutrition_source_check;
alter table public.my_meal_items add constraint my_meal_items_nutrition_source_check check (nutrition_source is null or nutrition_source in ('catalog','ai_estimate','manual'));

create or replace function public.save_ai_meal_to_log(
  p_entry_id uuid, p_date date, p_meal_id uuid, p_meal_slot text,
  p_components jsonb, p_save_meal boolean default false, p_saved_meal_name text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_component jsonb; v_index integer:=0; v_existing integer; v_saved_meal_id uuid;
  v_food_id text; v_name text; v_grams numeric; v_calories numeric; v_protein numeric; v_carbs numeric; v_fat numeric;
  v_source text; v_per100 jsonb;
begin
  if auth.uid() is distinct from '368e193a-1364-4069-9743-be3da7bddac1'::uuid then raise exception 'feature_unavailable';end if;
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  if p_entry_id is null or p_date>(now() at time zone 'Asia/Jerusalem')::date then raise exception 'invalid_ai_meal';end if;
  if p_meal_slot not in ('breakfast','lunch','dinner','snack') then raise exception 'invalid_meal_slot';end if;
  if jsonb_typeof(p_components)<>'array' or jsonb_array_length(p_components)<1 or jsonb_array_length(p_components)>20 then raise exception 'invalid_components';end if;
  if p_meal_id is not null and not exists(
    select 1 from public.meals m join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
    where m.id=p_meal_id and a.client_id=auth.uid() and a.status='active'
  ) then raise exception 'meal_not_assigned';end if;
  -- Serialise retries for the same signed draft. The unique index is the final
  -- guard, while this lock lets a concurrent retry receive a clean duplicate
  -- response instead of a unique-violation error.
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
    v_source:=v_component->>'nutritionSource'; v_per100:=v_component->'per100';
    if length(v_name) not between 1 and 200 or v_grams<=0 or v_grams>3000 or v_source not in ('catalog','ai_estimate') then raise exception 'invalid_component';end if;
    if v_source='catalog' then
      if v_food_id is null then raise exception 'food_required';end if;
      select round(coalesce(calories,0)*v_grams/100,1),
        case when protein is null then null else round(protein*v_grams/100,1) end,
        case when carbs is null then null else round(carbs*v_grams/100,1) end,
        case when fat is null then null else round(fat*v_grams/100,1) end
      into v_calories,v_protein,v_carbs,v_fat from public.foods where id=v_food_id;
      if not found then raise exception 'food_not_found';end if;
    else
      if v_food_id is not null or jsonb_typeof(v_per100)<>'object'
        or coalesce((v_per100->>'calories')::numeric,-1) not between 0 and 900
        or coalesce((v_per100->>'protein')::numeric,-1) not between 0 and 100
        or coalesce((v_per100->>'carbs')::numeric,-1) not between 0 and 100
        or coalesce((v_per100->>'fat')::numeric,-1) not between 0 and 100
      then raise exception 'invalid_estimate';end if;
      v_calories:=round((v_per100->>'calories')::numeric*v_grams/100,1);
      v_protein:=round((v_per100->>'protein')::numeric*v_grams/100,1);
      v_carbs:=round((v_per100->>'carbs')::numeric*v_grams/100,1);
      v_fat:=round((v_per100->>'fat')::numeric*v_grams/100,1);
    end if;
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

create or replace function public.save_my_meal(p_id uuid,p_name text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_item jsonb;v_food_id text;v_quantity numeric;v_unit text;v_order integer:=0;v_snapshot jsonb;v_snapshot_name text;
begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  if length(btrim(coalesce(p_name,'')))<1 or length(btrim(p_name))>80 then raise exception 'invalid_meal_name';end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20 then raise exception 'invalid_meal_items';end if;
  if p_id is null then insert into public.my_meals(client_id,name) values(auth.uid(),btrim(p_name)) returning id into v_id;
  else update public.my_meals set name=btrim(p_name),updated_at=now() where id=p_id and client_id=auth.uid() returning id into v_id;
    if v_id is null then raise exception 'meal_not_found';end if;delete from public.my_meal_items where meal_id=v_id;end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_food_id:=nullif(btrim(coalesce(v_item->>'foodId','')),'');v_quantity:=nullif(v_item->>'quantity','')::numeric;v_unit:=btrim(coalesce(v_item->>'unit',''));v_snapshot:=v_item->'per100';v_snapshot_name:=btrim(coalesce(v_item->>'name',''));
    if v_quantity is null or v_quantity<=0 or v_quantity>100000 then raise exception 'invalid_quantity';end if;
    if length(v_unit)<1 or length(v_unit)>24 then raise exception 'invalid_unit';end if;
    if v_food_id is not null and not exists(select 1 from public.foods where id=v_food_id) then raise exception 'food_not_found';end if;
    if v_food_id is null and (length(v_snapshot_name) not between 1 and 200 or v_snapshot is null) then raise exception 'invalid_snapshot';end if;
    insert into public.my_meal_items(meal_id,food_id,quantity,unit,sort_order,snapshot_name,snapshot_calories,snapshot_protein,snapshot_carbs,snapshot_fat,nutrition_source)
    values(v_id,v_food_id,v_quantity,v_unit,v_order,case when v_food_id is null then v_snapshot_name end,
      case when v_food_id is null then (v_snapshot->>'calories')::numeric end,case when v_food_id is null then (v_snapshot->>'protein')::numeric end,
      case when v_food_id is null then (v_snapshot->>'carbs')::numeric end,case when v_food_id is null then (v_snapshot->>'fat')::numeric end,
      case when v_food_id is null then 'ai_estimate' else 'catalog' end);v_order:=v_order+1;
  end loop;return v_id;
end$$;

create or replace function public.duplicate_my_meal(p_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_new_id uuid;begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  insert into public.my_meals(client_id,name) select auth.uid(),left(name||' — עותק',80) from public.my_meals where id=p_id and client_id=auth.uid() returning id into v_new_id;
  if v_new_id is null then raise exception 'meal_not_found';end if;
  insert into public.my_meal_items(meal_id,food_id,quantity,unit,sort_order,snapshot_name,snapshot_calories,snapshot_protein,snapshot_carbs,snapshot_fat,nutrition_source)
  select v_new_id,food_id,quantity,unit,sort_order,snapshot_name,snapshot_calories,snapshot_protein,snapshot_carbs,snapshot_fat,nutrition_source from public.my_meal_items where meal_id=p_id;
  return v_new_id;
end$$;

create or replace function public.add_my_meal_to_log(p_id uuid,p_date date,p_time time default null,p_target_meal_id uuid default null)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;v_name text;
begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  if p_date>(now() at time zone 'Asia/Jerusalem')::date then raise exception 'future_date';end if;
  select name into v_name from public.my_meals where id=p_id and client_id=auth.uid();if v_name is null then raise exception 'meal_not_found';end if;
  if p_target_meal_id is not null and not exists(select 1 from public.meals m join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id where m.id=p_target_meal_id and a.client_id=auth.uid() and a.status='active') then raise exception 'meal_not_assigned';end if;
  insert into public.client_food_log(client_id,log_date,meal_id,food_id,name,quantity,unit,calories,protein,carbs,fat,source,eaten_at,nutrition_source)
  select auth.uid(),p_date,p_target_meal_id,i.food_id,coalesce(f.name,i.snapshot_name),i.quantity,i.unit,
    round(coalesce(f.calories,i.snapshot_calories,0)*(case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1),
    case when coalesce(f.protein,i.snapshot_protein) is null then null else round(coalesce(f.protein,i.snapshot_protein)*(case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    case when coalesce(f.carbs,i.snapshot_carbs) is null then null else round(coalesce(f.carbs,i.snapshot_carbs)*(case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    case when coalesce(f.fat,i.snapshot_fat) is null then null else round(coalesce(f.fat,i.snapshot_fat)*(case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    'scan',coalesce((p_date+p_time) at time zone 'Asia/Jerusalem',now()),coalesce(i.nutrition_source,'catalog')
  from public.my_meal_items i left join public.foods f on f.id=i.food_id where i.meal_id=p_id order by i.sort_order;
  get diagnostics v_count=row_count;
  if p_target_meal_id is not null then perform public.set_meal_day_status(p_target_meal_id,p_date,'other',left(v_name,500));end if;
  update public.my_meals set updated_at=now() where id=p_id;return v_count;
end$$;

revoke all on function public.save_my_meal(uuid,text,jsonb) from public,anon;
grant execute on function public.save_my_meal(uuid,text,jsonb) to authenticated;
revoke all on function public.duplicate_my_meal(uuid) from public,anon;
grant execute on function public.duplicate_my_meal(uuid) to authenticated;
revoke all on function public.add_my_meal_to_log(uuid,date,time,uuid) from public,anon;
grant execute on function public.add_my_meal_to_log(uuid,date,time,uuid) to authenticated;

notify pgrst,'reload schema';
commit;
