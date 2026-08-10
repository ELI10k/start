begin;

-- Foods can now arrive from three places: the curated START catalogue, an Open
-- Food Facts lookup after a barcode scan, and a person typing one in. Knowing
-- which matters - a curated row is authoritative, a scanned one is only as good
-- as the community database it came from.
--
-- Additive throughout: the column is nullable, existing rows keep reading as the
-- catalogue they already were, and no policy is weakened.

alter table public.foods add column if not exists source text;
alter table public.foods drop constraint if exists foods_source_check;
alter table public.foods add constraint foods_source_check
  check (source is null or source in ('start','openfoodfacts','manual'));

-- Everything already in the table is the curated catalogue.
update public.foods set source = 'start' where source is null;

-- One row per barcode. Partial, because most catalogue foods have no barcode and
-- several legitimately share a null.
create unique index if not exists foods_barcode_unique_idx
  on public.foods (barcode) where barcode is not null;

-- Writing to the catalogue stays closed - the table has no insert policy and does
-- not get one here. Contributions go through this function instead, which fixes
-- the id, forces the provenance, and refuses values that cannot be food.
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
language plpgsql security definer set search_path=public as $$
declare
  v_digits text;
  v_id text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_source not in ('openfoodfacts','manual') then raise exception 'invalid_food_source'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'food_name_required'; end if;

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

  v_id := case when v_digits is null
    then 'manual-' || replace(gen_random_uuid()::text, '-', '')
    else 'barcode-' || v_digits end;

  -- A barcode already known to START wins: a curated row is not overwritten by a
  -- community one, and re-scanning only refreshes a row of the same provenance.
  if v_digits is not null then
    select id into v_id from public.foods where barcode = v_digits limit 1;
    if found then
      update public.foods set
        name = case when source = 'start' then name else trim(p_name) end,
        brand = case when source = 'start' then brand else nullif(trim(p_brand),'') end,
        calories = case when source = 'start' then calories else p_calories end,
        protein = case when source = 'start' then protein else p_protein end,
        carbs = case when source = 'start' then carbs else p_carbs end,
        fat = case when source = 'start' then fat else p_fat end,
        source_url = case when source = 'start' then source_url else nullif(p_source_url,'') end
      where id = v_id;
      return v_id;
    end if;
    v_id := 'barcode-' || v_digits;
  end if;

  insert into public.foods(
    id, name, brand, category, calories, protein, carbs, fat,
    package_unit, unit_weight_grams, barcode, serving_label, source, source_url, verification_status
  ) values (
    v_id, trim(p_name), nullif(trim(p_brand),''), 'סריקה', p_calories, p_protein, p_carbs, p_fat,
    nullif(trim(p_package_unit),''), p_unit_weight_grams, v_digits,
    coalesce(nullif(trim(p_serving_label),''), '100 גרם'), p_source, nullif(p_source_url,''), 'unverified'
  )
  on conflict (id) do update set
    name = excluded.name, brand = excluded.brand, calories = excluded.calories,
    protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat,
    source = excluded.source, source_url = excluded.source_url;

  return v_id;
end $$;

revoke all on function public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text) from public;
revoke all on function public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text) from anon;
grant execute on function public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text) to authenticated;

commit;
