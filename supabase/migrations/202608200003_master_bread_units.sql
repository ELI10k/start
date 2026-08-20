-- Two more breads from Eli's portion table, countable by the unit.
--
-- Added 2026-08-20 at Eli's request, in his own figures:
--   לחמנייה  1 unit = 100 g = 250 kcal
--   בגט      1 unit = 150 g = 380 kcal
--
-- Both are unbranded, and both carry package_unit with unit_weight_grams, so a
-- coach can write "1 בגט" and the builder resolves it to 150 g - the same way
-- the pita already works.
--
-- Calories are Eli's and are not altered. He supplied only the calorie figure,
-- so the other three macros are sourced and then balanced against it, exactly
-- as 202608020001 did for the rest of his table:
--   לחמנייה - protein and fat from the catalog's own "לחמניות פשוט מלא" (אנג׳ל),
--             which is 250 kcal/100 g, the identical density. Carbohydrate is
--             solved from the calories so the row balances 4p + 4c + 9f.
--   בגט     - a plain white baguette profile, protein 9 and fat 1.5, with
--             carbohydrate solved the same way.
-- Both macro sets are estimates against a calorie figure that is not. If Eli
-- gives the real macros, update this row - the calories will not move.
--
-- The master-c- prefix does two things on its own: masterFoodGroup() files them
-- under carbohydrate, and isFavorite() treats every master food as starred
-- unless the coach has said otherwise. That is what "put them in favourites"
-- means here - no per-coach row is written, so nothing is imposed on anyone.
--
-- Impact: two catalog rows, idempotent. No schema change.
-- Rollback: supabase/seeds/master-bread-units-rollback.sql

begin;

insert into public.foods
  (id, name, category, calories, protein, carbs, fat, package_unit, unit_weight_grams, serving_label, notes)
values
  ('master-c-019', 'לחמנייה', 'מאסטר · פחמימה', 250, 13.1, 43.1, 2.8, 'לחמנייה', 100, '1 לחמנייה (100 גרם)', 'מאכל מאסטר — מקור: קובץ הקלוריות של אלי, מנה לאחר הכנה'),
  ('master-c-020', 'בגט', 'מאסטר · פחמימה', 253.333, 9, 50.96, 1.5, 'בגט', 150, '1 בגט (150 גרם)', 'מאכל מאסטר — מקור: קובץ הקלוריות של אלי, מנה לאחר הכנה')
on conflict (id) do update set
  name = excluded.name, category = excluded.category, calories = excluded.calories,
  protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat,
  package_unit = excluded.package_unit, unit_weight_grams = excluded.unit_weight_grams,
  serving_label = excluded.serving_label, notes = excluded.notes, updated_at = now();

notify pgrst, 'reload schema';
commit;
