begin;

-- The rate limiter that used to live in this file is gone: app_rate_limits,
-- added in 202608310003, already answers the same question and is the one the
-- application calls. Two tables counting the same thing is how they come to
-- disagree.
--
-- An earlier draft of this file did reach the database, so the table it created
-- is out there holding nothing and referenced by nothing. Dropping it here
-- rather than leaving it: an unused table with an auth.users foreign key is a
-- thing someone reads later and has to work out the meaning of.
drop function if exists public.consume_rate_limit(text, integer, integer);
drop table if exists public.rate_limit_events;

-- ------------------------------------------------------- a row has an author

-- A food row now remembers who wrote it.
--
-- upsert_scanned_food updated any row that was not curated START data, so one
-- client could rewrite the name and every macro of a product another client
-- had scanned - and the catalogue is shared, so the wrong number reached
-- everybody who scanned that barcode afterwards. Rows that already exist keep
-- a null author and are treated as nobody's, which only a coach may correct.
alter table public.foods
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.upsert_scanned_food(
  p_barcode text,
  p_name text,
  p_brand text,
  p_serving_label text,
  p_package_unit text,
  p_unit_weight_grams numeric,
  p_calories numeric,
  p_protein numeric,
  p_carbs numeric,
  p_fat numeric,
  p_source text,
  p_source_url text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_digits text;
  v_id text;
  v_owner uuid;
  v_source text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_source not in ('openfoodfacts','manual') then raise exception 'invalid_food_source'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'food_name_required'; end if;
  if length(trim(p_name)) > 200 then raise exception 'food_name_too_long'; end if;

  v_digits := nullif(regexp_replace(coalesce(p_barcode,''), '\D', '', 'g'), '');
  if v_digits is not null and v_digits !~ '^([0-9]{8}|[0-9]{12,13})$' then
    raise exception 'invalid_barcode';
  end if;
  if v_digits is not null and length(v_digits) = 12 then v_digits := '0' || v_digits; end if;

  -- The same bounds the client validates against, enforced where it counts.
  if p_calories is null or p_calories < 0 or p_calories > 900 then raise exception 'invalid_calories'; end if;
  if p_protein is not null and (p_protein < 0 or p_protein > 100) then raise exception 'invalid_protein'; end if;
  if p_carbs   is not null and (p_carbs   < 0 or p_carbs   > 100) then raise exception 'invalid_carbs'; end if;
  if p_fat     is not null and (p_fat     < 0 or p_fat     > 100) then raise exception 'invalid_fat'; end if;

  -- A barcode already known to START wins. Curated data is never overwritten,
  -- and a scanned row is refreshed only by whoever wrote it or by a coach, who
  -- is the person the catalogue is curated by. Anyone else scanning the same
  -- product gets the row that is already there - the safe answer, and also the
  -- correct one.
  if v_digits is not null then
    select id, created_by, source into v_id, v_owner, v_source
    from public.foods where barcode = v_digits limit 1;
    if found then
      if v_source <> 'start'
         and (v_owner = auth.uid() or public.current_role() = 'coach') then
        update public.foods set
          name = trim(p_name),
          brand = nullif(trim(p_brand),''),
          calories = p_calories,
          protein = p_protein,
          carbs = p_carbs,
          fat = p_fat,
          source_url = nullif(p_source_url,'')
        where id = v_id;
      end if;
      return v_id;
    end if;
    v_id := 'barcode-' || v_digits;
  else
    v_id := 'manual-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  insert into public.foods(
    id, name, brand, category, calories, protein, carbs, fat,
    package_unit, unit_weight_grams, barcode, serving_label, source, source_url,
    verification_status, created_by
  ) values (
    v_id, trim(p_name), nullif(trim(p_brand),''), 'סריקה',
    p_calories, p_protein, p_carbs, p_fat,
    nullif(trim(p_package_unit),''), p_unit_weight_grams, v_digits,
    coalesce(nullif(trim(p_serving_label),''), '100 גרם'),
    p_source, nullif(p_source_url,''), 'unverified', auth.uid()
  );

  return v_id;
end $$;

revoke all on function public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text) from public, anon;
grant execute on function public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated;

-- ------------------------------------------------------------- free text caps

-- Free text with no ceiling is a way to fill a database one row at a time. The
-- coach's own notes were already capped at 4,000 characters in the action that
-- writes them; these are the fields that were not, capped in the one place a
-- client cannot route around. NOT VALID leaves rows that already exist alone -
-- none are expected to be over the limit, and a migration is not the place to
-- find out. Every write from here forward is checked.
alter table public.check_ins
  drop constraint if exists check_ins_notes_length;
alter table public.check_ins
  add constraint check_ins_notes_length check (char_length(notes) <= 4000) not valid;

alter table public.free_menu_entries
  drop constraint if exists free_menu_entries_notes_length;
alter table public.free_menu_entries
  add constraint free_menu_entries_notes_length check (char_length(notes) <= 4000) not valid;

-- ------------------------------------------------------------------ the index

-- Performance, not security: consume_app_rate_limit deletes expired windows on
-- every call, and the table it deletes from has no index to delete by.
create index if not exists app_rate_limits_window
  on public.app_rate_limits (window_start);

notify pgrst, 'reload schema';
commit;
