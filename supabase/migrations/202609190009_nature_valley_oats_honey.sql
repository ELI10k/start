begin;

-- Nature Valley Crunchy oats & honey, from foodsdictionary.co.il (per 100 g:
-- 467 kcal, 8.7 protein, 64.3 carbs, 18.1 fat, 26.8 sugars, 341 mg sodium).
-- Sold as a pack of two 21 g bars, so it is entered both ways. As with the
-- Aroma rows, the per-100 g columns are derived back from the rounded serving
-- figures so the card shows exactly those whole numbers.
insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, package_quantity, package_unit, serving_label,
  verification_status, notes, source_url, unit_weight_grams,
  calories_per_unit, units_per_package
) values
  ('707', 'נייצ׳ר וואלי חטיף אנרגיה שיבולת שועל ודבש – יחידה (21 גרם)', 'NATURE VALLEY', 'חטיפי דגנים',
   466.667, 9.524, 66.667, 19.048, 28.571, 342.857, 1, 'יחידה', 'יחידה (21 גרם)', 'מאושר',
   'לפי foodsdictionary, ל-100 גרם: 467 קלוריות, 8.7 חלבון, 64.3 פחמימות, 18.1 שומן. ליחידה של 21 גרם מעוגל: 98 קלוריות, 2 חלבון, 14 פחמימות, 4 שומן.',
   'https://www.foodsdictionary.co.il/Products/191/', 21, 98, 1),
  ('708', 'נייצ׳ר וואלי חטיף אנרגיה שיבולת שועל ודבש – חבילה 2 יחידות (42 גרם)', 'NATURE VALLEY', 'חטיפי דגנים',
   466.667, 9.524, 64.286, 19.048, 26.190, 340.476, 1, 'חבילה', 'חבילה – 2 יחידות (42 גרם)', 'מאושר',
   'לפי foodsdictionary, ל-100 גרם: 467 קלוריות, 8.7 חלבון, 64.3 פחמימות, 18.1 שומן. לחבילה של 2 יחידות (42 גרם) מעוגל: 196 קלוריות, 4 חלבון, 27 פחמימות, 8 שומן.',
   'https://www.foodsdictionary.co.il/Products/191/', 42, 196, 1)
on conflict (id) do update set
  name = excluded.name, brand = excluded.brand, category = excluded.category,
  calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs,
  fat = excluded.fat, sugars = excluded.sugars, sodium_mg = excluded.sodium_mg,
  package_quantity = excluded.package_quantity, package_unit = excluded.package_unit,
  serving_label = excluded.serving_label, verification_status = excluded.verification_status,
  notes = excluded.notes, source_url = excluded.source_url,
  unit_weight_grams = excluded.unit_weight_grams, calories_per_unit = excluded.calories_per_unit,
  units_per_package = excluded.units_per_package, updated_at = now();

do $$
begin
  if (select count(*) from public.foods where id in ('707', '708') and brand = 'NATURE VALLEY') <> 2 then
    raise exception 'nature_valley_upsert_failed';
  end if;
end $$;

commit;
