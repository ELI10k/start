begin;

drop function if exists public.add_my_meal_to_log(uuid,date,time);
create function public.add_my_meal_to_log(p_id uuid, p_date date, p_time time default null, p_target_meal_id uuid default null)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer; v_name text;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_date > (now() at time zone 'Asia/Jerusalem')::date then raise exception 'future_date'; end if;
  select name into v_name from public.my_meals where id=p_id and client_id=auth.uid();
  if v_name is null then raise exception 'meal_not_found'; end if;
  if p_target_meal_id is not null and not exists(
    select 1 from public.meals m join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
    where m.id=p_target_meal_id and a.client_id=auth.uid() and a.status='active'
  ) then raise exception 'meal_not_assigned'; end if;

  insert into public.client_food_log(client_id,log_date,meal_id,food_id,name,quantity,unit,calories,protein,carbs,fat,source,eaten_at)
  select auth.uid(),p_date,p_target_meal_id,f.id,f.name,i.quantity,i.unit,
    round(coalesce(f.calories,0) * (case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1),
    case when f.protein is null then null else round(f.protein * (case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    case when f.carbs is null then null else round(f.carbs * (case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    case when f.fat is null then null else round(f.fat * (case when nullif(btrim(f.package_unit),'')=nullif(btrim(i.unit),'') and coalesce(f.unit_weight_grams,0)>0 then i.quantity*f.unit_weight_grams else i.quantity end)/100,1) end,
    'scan',coalesce((p_date+p_time) at time zone 'Asia/Jerusalem',now())
  from public.my_meal_items i join public.foods f on f.id=i.food_id where i.meal_id=p_id order by i.sort_order;
  get diagnostics v_count=row_count;
  if p_target_meal_id is not null then
    perform public.set_meal_day_status(p_target_meal_id,p_date,'other',left(v_name,500));
  end if;
  update public.my_meals set updated_at=now() where id=p_id;
  return v_count;
end $$;

revoke all on function public.add_my_meal_to_log(uuid,date,time,uuid) from public,anon;
grant execute on function public.add_my_meal_to_log(uuid,date,time,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
