-- Records whether an off-plan food replaced a whole meal or one group in it.
-- Existing rows remain whole-meal replacements. Rollback may drop the new
-- overload and column after clients have stopped sending p_meal_group_id.

begin;

alter table public.client_food_log
  add column if not exists meal_group_id uuid references public.meal_food_groups(id) on delete set null;

create index if not exists client_food_log_meal_group_idx
  on public.client_food_log (meal_group_id) where meal_group_id is not null;

create function public.log_client_food_scoped(
  p_date date, p_name text, p_source text,
  p_meal_id uuid default null, p_meal_group_id uuid default null,
  p_food_id text default null, p_quantity numeric default null,
  p_unit text default null, p_calories numeric default null,
  p_protein numeric default null, p_carbs numeric default null,
  p_fat numeric default null, p_photo_path text default null,
  p_eaten_time time default null
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
  if p_meal_group_id is not null and (
    p_meal_id is null or not exists(
      select 1 from public.meal_food_groups g
      where g.id = p_meal_group_id and g.meal_id = p_meal_id
    )
  ) then raise exception 'meal_group_not_in_meal'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text
    then raise exception 'invalid_photo_path'; end if;

  insert into public.client_food_log(
    client_id, log_date, meal_id, meal_group_id, food_id, name, quantity, unit,
    calories, protein, carbs, fat, photo_path, source, eaten_at)
  values(
    auth.uid(), p_date, p_meal_id, p_meal_group_id, p_food_id, v_name, p_quantity,
    nullif(btrim(coalesce(p_unit,'')),''), p_calories, p_protein, p_carbs, p_fat,
    nullif(btrim(coalesce(p_photo_path,'')),''), p_source,
    coalesce((p_date + p_eaten_time) at time zone 'Asia/Jerusalem', now()))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.log_client_food_scoped(date,text,text,uuid,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text,time) from public, anon;
grant execute on function public.log_client_food_scoped(date,text,text,uuid,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text,time) to authenticated;

notify pgrst, 'reload schema';
commit;

