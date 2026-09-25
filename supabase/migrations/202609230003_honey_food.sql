begin;

-- Plain honey, values per 100 g from FoodsDictionary.
insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, package_unit, serving_label, verification_status, notes, source_url,
  unit_weight_grams, calories_per_unit, units_per_package
) values (
  '709', 'דבש', null, 'ממרחים מתוקים', 304, 0.3, 82.4, 0, 82.12,
  4, 'כפית', 'כפית (7 גרם)', 'מאושר',
  'לפי FoodsDictionary, ל-100 גרם: 304 קלוריות, 0.3 גרם חלבון, 82.4 גרם פחמימות ו-0 גרם שומן. כפית של 7 גרם מכילה כ-21 קלוריות.',
  'https://www.foodsdictionary.co.il/Products/1/%D7%93%D7%91%D7%A9',
  7, 21.28, 1
)
on conflict (id) do update set
  name = excluded.name, brand = excluded.brand, category = excluded.category,
  calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs,
  fat = excluded.fat, sugars = excluded.sugars, sodium_mg = excluded.sodium_mg,
  package_unit = excluded.package_unit, serving_label = excluded.serving_label,
  verification_status = excluded.verification_status, notes = excluded.notes,
  source_url = excluded.source_url, unit_weight_grams = excluded.unit_weight_grams,
  calories_per_unit = excluded.calories_per_unit,
  units_per_package = excluded.units_per_package, updated_at = now();

commit;
