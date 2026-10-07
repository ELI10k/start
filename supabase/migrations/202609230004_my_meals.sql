begin;

alter table public.client_food_log add column if not exists eaten_at timestamptz;
update public.client_food_log set eaten_at=created_at where eaten_at is null;
alter table public.client_food_log alter column eaten_at set default now(), alter column eaten_at set not null;

create table if not exists public.my_meals (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 80), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.my_meal_items (
  id uuid primary key default gen_random_uuid(), meal_id uuid not null references public.my_meals(id) on delete cascade,
  food_id text not null references public.foods(id) on delete restrict, quantity numeric(10,2) not null check(quantity>0 and quantity<=100000),
  unit text not null check(length(btrim(unit)) between 1 and 24), sort_order integer not null default 0 check(sort_order>=0), created_at timestamptz not null default now()
);
create index if not exists my_meals_client_updated_idx on public.my_meals(client_id,updated_at desc);
create index if not exists my_meal_items_meal_order_idx on public.my_meal_items(meal_id,sort_order);
alter table public.my_meals enable row level security;
alter table public.my_meal_items enable row level security;
create policy my_meals_self on public.my_meals for all to authenticated using(client_id=(select auth.uid())) with check(client_id=(select auth.uid()));
create policy my_meal_items_self on public.my_meal_items for all to authenticated
  using(exists(select 1 from public.my_meals m where m.id=meal_id and m.client_id=(select auth.uid())))
  with check(exists(select 1 from public.my_meals m where m.id=meal_id and m.client_id=(select auth.uid())));
grant select,insert,update,delete on public.my_meals,public.my_meal_items to authenticated;

create function public.save_my_meal(p_id uuid,p_name text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_item jsonb;v_food_id text;v_quantity numeric;v_unit text;v_order integer:=0;
begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  if length(btrim(coalesce(p_name,'')))<1 or length(btrim(p_name))>80 then raise exception 'invalid_meal_name';end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>20 then raise exception 'invalid_meal_items';end if;
  if p_id is null then insert into public.my_meals(client_id,name) values(auth.uid(),btrim(p_name)) returning id into v_id;
  else update public.my_meals set name=btrim(p_name),updated_at=now() where id=p_id and client_id=auth.uid() returning id into v_id;
    if v_id is null then raise exception 'meal_not_found';end if;delete from public.my_meal_items where meal_id=v_id;end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_food_id:=btrim(coalesce(v_item->>'foodId',''));v_quantity:=nullif(v_item->>'quantity','')::numeric;v_unit:=btrim(coalesce(v_item->>'unit',''));
    if v_quantity is null or v_quantity<=0 or v_quantity>100000 then raise exception 'invalid_quantity';end if;
    if length(v_unit)<1 or length(v_unit)>24 then raise exception 'invalid_unit';end if;
    if not exists(select 1 from public.foods where id=v_food_id) then raise exception 'food_not_found';end if;
    insert into public.my_meal_items(meal_id,food_id,quantity,unit,sort_order) values(v_id,v_food_id,v_quantity,v_unit,v_order);v_order:=v_order+1;
  end loop;return v_id;
end$$;
create function public.delete_my_meal(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;delete from public.my_meals where id=p_id and client_id=auth.uid();return found;end$$;
create function public.duplicate_my_meal(p_id uuid) returns uuid language plpgsql security definer set search_path=public as $$declare v_new_id uuid;begin
  if public.current_role()<>'client' then raise exception 'client_required';end if;
  insert into public.my_meals(client_id,name) select auth.uid(),left(name||' — עותק',80) from public.my_meals where id=p_id and client_id=auth.uid() returning id into v_new_id;
  if v_new_id is null then raise exception 'meal_not_found';end if;
  insert into public.my_meal_items(meal_id,food_id,quantity,unit,sort_order) select v_new_id,food_id,quantity,unit,sort_order from public.my_meal_items where meal_id=p_id;return v_new_id;end$$;
revoke all on function public.save_my_meal(uuid,text,jsonb),public.delete_my_meal(uuid),public.duplicate_my_meal(uuid) from public,anon;
grant execute on function public.save_my_meal(uuid,text,jsonb),public.delete_my_meal(uuid),public.duplicate_my_meal(uuid) to authenticated;
notify pgrst,'reload schema';commit;
