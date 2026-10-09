begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, barcode,
  serving_label, verification_status, notes, source_url,
  unit_weight_grams, calories_per_unit, units_per_package
) values (
  '359',
  'קינוח בצק מטוגן במילוי קרם פטיסייר',
  null,
  'מאפי מאפייה',
  466.67,
  6.67,
  46.67,
  28,
  null,
  null,
  null,
  1,
  'יחידה',
  null,
  'יחידה 150 גרם',
  'ממתין לבדיקה',
  'ערכים שנמסרו על ידי המשתמש; סה״כ ליחידה של 150 גרם: 700 קלוריות, 10 גרם חלבון, 70 גרם פחמימות ו-42 גרם שומן.',
  null,
  150,
  700,
  1
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
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from public.foods
    where id = '359'
      and name = 'קינוח בצק מטוגן במילוי קרם פטיסייר'
      and unit_weight_grams = 150
      and calories_per_unit = 700
      and package_quantity = 1
      and package_unit = 'יחידה'
      and protein = 6.67
      and carbs = 46.67
      and fat = 28
  ) then
    raise exception 'pastry_cream_fried_dessert_upsert_failed';
  end if;
end $$;

commit;
