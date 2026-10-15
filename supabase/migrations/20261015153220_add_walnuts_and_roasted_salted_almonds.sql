begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, barcode,
  serving_label, verification_status, notes, source_url,
  unit_weight_grams, calories_per_unit, units_per_package, source
) values
(
  'walnuts', 'אגוזי מלך', null, 'אגוזים וזרעים', 654, 15.2, 13.7, 65.2, null,
  2, null, null, 'יחידה', null,
  'אגוז שלם (2 חצאים, כ-4 גרם)', 'ממתין לבדיקה',
  'ערכים ל-100 גרם שנמסרו על ידי המשתמש; סיבים תזונתיים: כ-6.7 גרם. חצי אגוז (כ-2 גרם): כ-13 קלוריות; חופן של כ-30 גרם: כ-196 קלוריות.',
  null, 4, 26, 1, 'start'
),
(
  'roasted-salted-almonds', 'שקדים קלויים ומלוחים', null, 'אגוזים וזרעים', 613, 22, 19, 53, 4,
  650, null, null, 'יחידה', null,
  'שקד אחד (כ-1.2 גרם)', 'ממתין לבדיקה',
  'ערכים ל-100 גרם שנמסרו על ידי המשתמש; שומן רווי: 4 גרם; סיבים תזונתיים: כ-3.5 גרם. חופן של כ-30 גרם: כ-184 קלוריות.',
  null, 1.2, 7.3, 1, 'start'
)
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  sugars = excluded.sugars,
  sodium_mg = excluded.sodium_mg,
  calcium_mg = excluded.calcium_mg,
  package_quantity = excluded.package_quantity,
  package_unit = excluded.package_unit,
  barcode = excluded.barcode,
  serving_label = excluded.serving_label,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  source_url = excluded.source_url,
  unit_weight_grams = excluded.unit_weight_grams,
  calories_per_unit = excluded.calories_per_unit,
  units_per_package = excluded.units_per_package,
  source = excluded.source,
  updated_at = now();

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = 'walnuts'
      and calories = 654 and protein = 15.2 and carbs = 13.7 and fat = 65.2
      and sodium_mg = 2 and unit_weight_grams = 4 and calories_per_unit = 26
      and serving_label = 'אגוז שלם (2 חצאים, כ-4 גרם)' and source = 'start'
  ) then
    raise exception 'walnuts_upsert_failed';
  end if;

  if not exists (
    select 1 from public.foods
    where id = 'roasted-salted-almonds'
      and calories = 613 and protein = 22 and carbs = 19 and fat = 53
      and sugars = 4 and sodium_mg = 650 and unit_weight_grams = 1.2
      and calories_per_unit = 7.3 and serving_label = 'שקד אחד (כ-1.2 גרם)'
      and source = 'start'
  ) then
    raise exception 'roasted_salted_almonds_upsert_failed';
  end if;
end $$;

commit;
