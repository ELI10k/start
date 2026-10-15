begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, barcode,
  serving_label, verification_status, notes, source_url,
  unit_weight_grams, calories_per_unit, units_per_package, source
) values (
  'muller-protein-40-vanilla-350ml',
  'משקה חלבון מולר וניל 40 גרם חלבון 0% שומן',
  'מולר',
  'יוגורט חלבון',
  64,
  11.43,
  4.5,
  0,
  4.5,
  40,
  240,
  350,
  'בקבוק',
  '7290114312551',
  'בקבוק 350 מ״ל',
  'מאושר',
  'ערכים ל-100 מ״ל לפי תווית המוצר; סה״כ לבקבוק 350 מ״ל: 224 קלוריות, 40 גרם חלבון, 15.75 גרם פחמימות ו-0 גרם שומן.',
  null,
  350,
  224,
  1,
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
    where id = 'muller-protein-40-vanilla-350ml'
      and name = 'משקה חלבון מולר וניל 40 גרם חלבון 0% שומן'
      and calories = 64
      and protein = 11.43
      and carbs = 4.5
      and fat = 0
      and package_quantity = 350
      and package_unit = 'בקבוק'
      and barcode = '7290114312551'
      and unit_weight_grams = 350
      and calories_per_unit = 224
      and units_per_package = 1
      and source = 'start'
  ) then
    raise exception 'muller_protein_40_vanilla_350ml_upsert_failed';
  end if;
end $$;

commit;
