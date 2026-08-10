begin;

-- Rollback for 202608100002_scanned_foods.sql.
--
-- Removes the contribution path and the barcode uniqueness, and leaves the
-- catalogue exactly as it was. Deliberately does NOT drop foods.source: rows
-- contributed while the migration was live are only distinguishable from curated
-- ones by that column, and dropping it would silently promote community data to
-- looking like START data. Drop it by hand once you have decided what to do with
-- those rows.

drop function if exists public.upsert_scanned_food(text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text);

drop index if exists public.foods_barcode_unique_idx;

-- To go all the way back, after reviewing the contributed rows:
--
--   select id, name, brand, barcode, source from public.foods
--   where source in ('openfoodfacts','manual');
--
--   delete from public.foods where source in ('openfoodfacts','manual');
--   alter table public.foods drop constraint if exists foods_source_check;
--   alter table public.foods drop column if exists source;
--
-- Deleting a food that a client has already logged will fail if free_menu_entries
-- references it; clear those entries first or keep the row.

commit;
