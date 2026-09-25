begin;

alter table public.client_food_log
  add column if not exists eaten_at timestamptz;

update public.client_food_log
set eaten_at = created_at
where eaten_at is null;

alter table public.client_food_log
  alter column eaten_at set default now(),
  alter column eaten_at set not null;

drop function if exists public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text);

create function public.log_client_food(
  p_date date, p_name text, p_source text,
  p_meal_id uuid default null, p_food_id text default null,
  p_quantity numeric default null, p_unit text default null,
  p_calories numeric default null, p_protein numeric default null,
  p_carbs numeric default null, p_fat numeric default null,
  p_photo_path text default null, p_eaten_time time default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if length(v_name) = 0 then raise exception 'food_name_required'; end if;
  if p_source not in ('text','scan','photo') then raise exception 'invalid_food_source'; end if;
  if p_meal_id is not null and not exists(
    select 1 from public.meals m
    join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
    where m.id = p_meal_id and a.client_id = auth.uid() and a.status = 'active'
  ) then raise exception 'meal_not_assigned'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text
    then raise exception 'invalid_photo_path'; end if;

  insert into public.client_food_log(
    client_id, log_date, meal_id, food_id, name, quantity, unit,
    calories, protein, carbs, fat, photo_path, source, eaten_at)
  values(
    auth.uid(), p_date, p_meal_id, p_food_id, v_name, p_quantity, nullif(btrim(coalesce(p_unit,'')),''),
    p_calories, p_protein, p_carbs, p_fat, nullif(btrim(coalesce(p_photo_path,'')),''), p_source,
    coalesce((p_date + p_eaten_time) at time zone 'Asia/Jerusalem', now()))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_client_food_log(p_id uuid, p_quantity numeric, p_time time)
returns boolean
language plpgsql security definer set search_path=public as $$
declare
  v_entry public.client_food_log%rowtype;
  v_food public.foods%rowtype;
  v_weight numeric;
  v_factor numeric;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then raise exception 'invalid_quantity'; end if;

  select * into v_entry from public.client_food_log
  where id = p_id and client_id = auth.uid() for update;
  if not found then return false; end if;
  if v_entry.food_id is null then raise exception 'catalogue_food_required'; end if;

  select * into v_food from public.foods where id = v_entry.food_id;
  if not found then raise exception 'catalogue_food_required'; end if;

  v_weight := case
    when nullif(btrim(coalesce(v_food.package_unit,'')), '') = nullif(btrim(coalesce(v_entry.unit,'')), '')
      and coalesce(v_food.unit_weight_grams,0) > 0
      then p_quantity * v_food.unit_weight_grams
    else p_quantity
  end;
  v_factor := v_weight / 100;

  update public.client_food_log set
    quantity = p_quantity,
    calories = round(coalesce(v_food.calories,0) * v_factor, 1),
    protein = case when v_food.protein is null then null else round(v_food.protein * v_factor, 1) end,
    carbs = case when v_food.carbs is null then null else round(v_food.carbs * v_factor, 1) end,
    fat = case when v_food.fat is null then null else round(v_food.fat * v_factor, 1) end,
    eaten_at = (v_entry.log_date + p_time) at time zone 'Asia/Jerusalem'
  where id = p_id and client_id = auth.uid();
  return true;
end $$;

revoke all on function public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text,time) from public, anon;
grant execute on function public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text,time) to authenticated;
revoke all on function public.update_client_food_log(uuid,numeric,time) from public, anon;
grant execute on function public.update_client_food_log(uuid,numeric,time) to authenticated;

grant update(nutrition_goal) on table public.client_profiles to authenticated;

notify pgrst, 'reload schema';
commit;
