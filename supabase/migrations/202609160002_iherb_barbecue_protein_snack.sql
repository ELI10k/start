begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, serving_label,
  verification_status, notes, unit_weight_grams, calories_per_unit,
  units_per_package
) values (
  '342',
  'חטיף חלבון בטעם ברביקיו iHerb',
  'iHerb',
  'חטיפי חלבון',
  400,
  70,
  6.67,
  10,
  6.67,
  1267,
  897,
  10,
  'מנה',
  'מנה של 30 גרם',
  'מאושר',
  'לפי התווית המצולמת; למנה: 120 קלוריות, 21 גרם חלבון, 2 גרם פחמימות, 3 גרם שומן, 2 גרם סוכרים, 380 מ״ג נתרן ו-269 מ״ג סידן. האריזה מכילה 10 מנות.',
  30,
  120,
  10
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
  serving_label = excluded.serving_label,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  unit_weight_grams = excluded.unit_weight_grams,
  calories_per_unit = excluded.calories_per_unit,
  units_per_package = excluded.units_per_package,
  updated_at = now();

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = '342'
      and name = 'חטיף חלבון בטעם ברביקיו iHerb'
      and calories = 400
      and protein = 70
      and unit_weight_grams = 30
      and calories_per_unit = 120
  ) then
    raise exception 'iherb_barbecue_protein_snack_upsert_failed';
  end if;
end $$;

commit;
