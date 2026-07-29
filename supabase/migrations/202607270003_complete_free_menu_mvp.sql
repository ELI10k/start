begin;

alter table public.free_menu_days add column if not exists enabled_by uuid references public.profiles(id) on delete set null;
alter table public.free_menu_entries add column if not exists client_request_key text;
create unique index if not exists free_menu_entries_request_key_idx on public.free_menu_entries(free_menu_day_id, client_request_key) where client_request_key is not null;

create or replace function public.recalculate_free_menu_summary(p_day_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.free_menu_daily_summaries(free_menu_day_id,calories,protein,carbohydrates,fat,entries_count,missing_nutrition_count)
  select p_day_id,coalesce(sum(case when has_nutrition then coalesce(calories,0) else 0 end),0),coalesce(sum(case when has_nutrition then coalesce(protein,0) else 0 end),0),coalesce(sum(case when has_nutrition then coalesce(carbohydrates,0) else 0 end),0),coalesce(sum(case when has_nutrition then coalesce(fat,0) else 0 end),0),count(*),count(*) filter(where not has_nutrition)
  from public.free_menu_entries where free_menu_day_id=p_day_id
  on conflict(free_menu_day_id) do update set calories=excluded.calories,protein=excluded.protein,carbohydrates=excluded.carbohydrates,fat=excluded.fat,entries_count=excluded.entries_count,missing_nutrition_count=excluded.missing_nutrition_count,updated_at=now();
end $$;

create or replace function public.enable_free_menu_day(p_client_id uuid,p_date date,p_calorie_target numeric default null,p_protein_target numeric default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null or public.current_role()<>'coach' or not public.is_coach_for(p_client_id) or p_date<current_date then raise exception 'not_authorized_for_free_menu'; end if;
  insert into public.free_menu_days(client_id,coach_id,enabled_by,menu_date,calorie_target,protein_target,status) values(p_client_id,auth.uid(),auth.uid(),p_date,p_calorie_target,p_protein_target,'active')
  on conflict(client_id,menu_date) do update set coach_id=excluded.coach_id,enabled_by=excluded.enabled_by,calorie_target=excluded.calorie_target,protein_target=excluded.protein_target,status='active'
  returning id into v_id; return v_id;
end $$;

create or replace function public.save_free_menu_entry_v2(p_date date,p_food_id text,p_name text,p_quantity numeric,p_unit text,p_meal_label text,p_eaten_at timestamptz,p_notes text,p_calories numeric,p_protein numeric,p_carbohydrates numeric,p_fat numeric,p_request_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_day uuid; v_id uuid; v_food record; v_has boolean;
begin
  if auth.uid() is null or public.current_role()<>'client' or p_quantity<=0 or length(trim(p_name))=0 then raise exception 'invalid_free_menu_entry'; end if;
  select id into v_day from public.free_menu_days where client_id=auth.uid() and menu_date=p_date and status='active'; if v_day is null then raise exception 'free_menu_not_enabled'; end if;
  if nullif(p_food_id,'') is not null then select calories,protein,carbs,fat into v_food from public.foods where id=p_food_id; if not found then raise exception 'food_not_found'; end if; p_calories:=v_food.calories*p_quantity/100; p_protein:=coalesce(v_food.protein,0)*p_quantity/100; p_carbohydrates:=coalesce(v_food.carbs,0)*p_quantity/100; p_fat:=coalesce(v_food.fat,0)*p_quantity/100; end if;
  v_has := p_calories is not null or p_protein is not null or p_carbohydrates is not null or p_fat is not null;
  insert into public.free_menu_entries(free_menu_day_id,food_id,name,quantity,unit,meal_label,eaten_at,notes,calories,protein,carbohydrates,fat,has_nutrition,client_request_key) values(v_day,nullif(p_food_id,''),trim(p_name),p_quantity,coalesce(nullif(trim(p_unit),''),'g'),coalesce(nullif(trim(p_meal_label),''),'חופשי'),coalesce(p_eaten_at,now()),nullif(trim(p_notes),''),p_calories,p_protein,p_carbohydrates,p_fat,v_has,nullif(trim(p_request_key),'')) on conflict(free_menu_day_id,client_request_key) where client_request_key is not null do update set id=free_menu_entries.id returning id into v_id;
  perform public.recalculate_free_menu_summary(v_day); return v_id;
end $$;

create or replace function public.update_free_menu_entry(p_entry_id uuid,p_quantity numeric,p_unit text,p_meal_label text,p_eaten_at timestamptz,p_notes text,p_calories numeric,p_protein numeric,p_carbohydrates numeric,p_fat numeric) returns void language plpgsql security definer set search_path=public as $$
declare v_day uuid;
begin
  select d.id into v_day from public.free_menu_entries e join public.free_menu_days d on d.id=e.free_menu_day_id where e.id=p_entry_id and d.client_id=auth.uid() and d.status='active'; if v_day is null or public.current_role()<>'client' or p_quantity<=0 then raise exception 'not_authorized_for_free_menu_entry'; end if;
  update public.free_menu_entries set quantity=p_quantity,unit=coalesce(nullif(trim(p_unit),''),'g'),meal_label=coalesce(nullif(trim(p_meal_label),''),'חופשי'),eaten_at=coalesce(p_eaten_at,eaten_at),notes=nullif(trim(p_notes),''),calories=p_calories,protein=p_protein,carbohydrates=p_carbohydrates,fat=p_fat,has_nutrition=(p_calories is not null or p_protein is not null or p_carbohydrates is not null or p_fat is not null),updated_at=now() where id=p_entry_id;
  perform public.recalculate_free_menu_summary(v_day);
end $$;

create or replace function public.delete_free_menu_entry(p_entry_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare v_day uuid; begin select d.id into v_day from public.free_menu_entries e join public.free_menu_days d on d.id=e.free_menu_day_id where e.id=p_entry_id and d.client_id=auth.uid() and d.status='active'; if v_day is null or public.current_role()<>'client' then raise exception 'not_authorized_for_free_menu_entry'; end if; delete from public.free_menu_entries where id=p_entry_id; perform public.recalculate_free_menu_summary(v_day); end $$;

revoke all on function public.enable_free_menu_day(uuid,date,numeric,numeric),public.save_free_menu_entry_v2(date,text,text,numeric,text,text,timestamptz,text,numeric,numeric,numeric,numeric,text),public.update_free_menu_entry(uuid,numeric,text,text,timestamptz,text,numeric,numeric,numeric,numeric),public.delete_free_menu_entry(uuid),public.recalculate_free_menu_summary(uuid) from public;
grant execute on function public.enable_free_menu_day(uuid,date,numeric,numeric),public.save_free_menu_entry_v2(date,text,text,numeric,text,text,timestamptz,text,numeric,numeric,numeric,numeric,text),public.update_free_menu_entry(uuid,numeric,text,text,timestamptz,text,numeric,numeric,numeric,numeric),public.delete_free_menu_entry(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
