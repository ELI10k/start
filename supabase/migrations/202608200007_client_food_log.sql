-- What the client actually ate, when it was not what the plan said.
--
-- "אכלתי משהו אחר" recorded free text and nothing else. It was the honest
-- answer to a real situation - better than "לא נאכל" - but it bought the coach
-- a sentence and cost the day its numbers, because free text has no macros and
-- START does not invent them.
--
-- Three ways to say it, and two of them carry figures:
--   text  - a sentence, as today. No macros; the coach reads it.
--   scan  - a barcode, resolved against the catalog or Open Food Facts, with a
--           quantity. Real macros, counted into the day.
--   photo - a picture of the plate. No macros either, but a photograph tells a
--           coach more in two seconds than a paragraph does.
--
-- The row stands beside the meal it replaced rather than inside it: the plan is
-- what the coach wrote and does not change because a person ate something else.
-- meal_id is nullable so a snack that belongs to no meal can be logged too.
--
-- Photos go to their own private bucket under the same rule the check-in photos
-- use - the first path segment is the owner's id, and the policies read it - so
-- nothing here invents a second way of deciding who may see a picture.
--
-- Impact: one new table, one new bucket, two functions. Nothing existing moves.
-- Rollback: supabase/seeds/client-food-log-rollback.sql

begin;

create table if not exists public.client_food_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  -- Which planned meal this stands in for. Null is a snack that belongs to none.
  meal_id uuid references public.meals(id) on delete set null,
  -- Where the figures came from, when they came from the catalog at all.
  food_id text references public.foods(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 200),
  quantity numeric(10,2) check (quantity is null or quantity > 0),
  unit text check (unit is null or length(btrim(unit)) between 1 and 24),
  calories numeric(8,2) check (calories is null or calories >= 0),
  protein numeric(8,2) check (protein is null or protein >= 0),
  carbs numeric(8,2) check (carbs is null or carbs >= 0),
  fat numeric(8,2) check (fat is null or fat >= 0),
  photo_path text,
  source text not null check (source in ('text','scan','photo')),
  created_at timestamptz not null default now()
);

create index if not exists client_food_log_client_date_idx
  on public.client_food_log (client_id, log_date desc);
create index if not exists client_food_log_meal_idx
  on public.client_food_log (meal_id) where meal_id is not null;

alter table public.client_food_log enable row level security;

drop policy if exists client_food_log_self on public.client_food_log;
create policy client_food_log_self on public.client_food_log
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

-- A coach reads their own clients' entries and never writes them: this is the
-- client's account of their own day.
drop policy if exists client_food_log_coach_read on public.client_food_log;
create policy client_food_log_coach_read on public.client_food_log
  for select to authenticated
  using (public.is_coach_for(client_id));

grant select, insert, delete on public.client_food_log to authenticated;

-- ------------------------------------------------------------------ storage

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('food-log-photos', 'food-log-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists food_log_photo_client_write on storage.objects;
create policy food_log_photo_client_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'food-log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists food_log_photo_client_read on storage.objects;
create policy food_log_photo_client_read on storage.objects
  for select to authenticated
  using (bucket_id = 'food-log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists food_log_photo_client_delete on storage.objects;
create policy food_log_photo_client_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'food-log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists food_log_photo_coach_read on storage.objects;
create policy food_log_photo_coach_read on storage.objects
  for select to authenticated
  using (bucket_id = 'food-log-photos' and exists(
    select 1 from public.coach_client_relationships r
    where r.coach_id = auth.uid()
      and r.client_id = ((storage.foldername(name))[1])::uuid
      and r.status = 'active'));

-- ----------------------------------------------------------------- functions

create or replace function public.log_client_food(
  p_date date, p_name text, p_source text,
  p_meal_id uuid default null, p_food_id text default null,
  p_quantity numeric default null, p_unit text default null,
  p_calories numeric default null, p_protein numeric default null,
  p_carbs numeric default null, p_fat numeric default null,
  p_photo_path text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if length(v_name) = 0 then raise exception 'food_name_required'; end if;
  if p_source not in ('text','scan','photo') then raise exception 'invalid_food_source'; end if;
  -- A meal can only be named if it belongs to a plan assigned to this client.
  if p_meal_id is not null and not exists(
    select 1 from public.meals m
    join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
    where m.id = p_meal_id and a.client_id = auth.uid() and a.status = 'active'
  ) then raise exception 'meal_not_assigned'; end if;
  -- A photo path has to sit under this client's own folder, the same rule the
  -- storage policy enforces - checked here too so a row can never point
  -- somewhere its owner could not have written.
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text
    then raise exception 'invalid_photo_path'; end if;

  insert into public.client_food_log(
    client_id, log_date, meal_id, food_id, name, quantity, unit,
    calories, protein, carbs, fat, photo_path, source)
  values(
    auth.uid(), p_date, p_meal_id, p_food_id, v_name, p_quantity, nullif(btrim(coalesce(p_unit,'')),''),
    p_calories, p_protein, p_carbs, p_fat, nullif(btrim(coalesce(p_photo_path,'')),''), p_source)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.delete_client_food_log(p_id uuid)
returns boolean
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  delete from public.client_food_log where id = p_id and client_id = auth.uid();
  return found;
end $$;

revoke all on function public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text) from public, anon;
grant execute on function public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text) to authenticated;
revoke all on function public.delete_client_food_log(uuid) from public, anon;
grant execute on function public.delete_client_food_log(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
