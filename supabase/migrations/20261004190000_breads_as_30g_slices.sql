-- Present sliced breads consistently as one 30 g slice.
--
-- Nutrition columns remain the source values per 100 g. The catalogue scales
-- them to the natural unit, so each card now shows the calories and macros for
-- a single 30 g slice. Restaurant dishes containing bread are intentionally
-- excluded because they are complete meals rather than sliced bread products.

begin;

update public.foods
set
  name = case
    when id = '61' then 'פרוסה לחם אחיד'
    when name like 'פרוסה %' then name
    else 'פרוסה ' || regexp_replace(name, '^1[[:space:]]+', '')
  end,
  package_unit = 'פרוסה',
  unit_weight_grams = 30,
  serving_label = '1 פרוסה (30 גרם)',
  calories_per_unit = round((calories * 0.3)::numeric, 0),
  updated_at = now()
where category = 'לחם';

update public.foods
set
  name = case id
    when 'master-c-009' then 'פרוסה לחם מלא'
    when 'master-c-010' then 'פרוסה לחם קל מחיטה מלאה'
  end,
  package_unit = 'פרוסה',
  unit_weight_grams = 30,
  serving_label = '1 פרוסה (30 גרם)',
  calories_per_unit = round((calories * 0.3)::numeric, 0),
  updated_at = now()
where id in ('master-c-009', 'master-c-010');

notify pgrst, 'reload schema';
commit;
