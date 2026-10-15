begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, barcode,
  serving_label, verification_status, notes, source_url,
  unit_weight_grams, calories_per_unit, units_per_package, source
) values (
  'roasted-cashews',
  'קשיו קלוי',
  null,
  'אגוזים וזרעים',
  606,
  15,
  30,
  47,
  null,
  600,
  null,
  null,
  null,
  null,
  'ל-100 גרם',
  'ממתין לבדיקה',
  'ערכים ל-100 גרם שנמסרו על ידי המשתמש; הנתרן הוא ערך משוער של כ-600 מ״ג.',
  null,
  null,
  null,
  null,
  'start'
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
    select 1
    from public.foods
    where id = 'roasted-cashews'
      and name = 'קשיו קלוי'
      and category = 'אגוזים וזרעים'
      and calories = 606
      and protein = 15
      and carbs = 30
      and fat = 47
      and sodium_mg = 600
      and serving_label = 'ל-100 גרם'
      and source = 'start'
  ) then
    raise exception 'roasted_cashews_upsert_failed';
  end if;
end $$;

commit;
