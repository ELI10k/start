begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, calcium_mg, package_quantity, package_unit, serving_label,
  verification_status, notes, source_url, unit_weight_grams,
  calories_per_unit, units_per_package
) values (
  '341',
  'דנונה PRO יוגורט 20 גרם חלבון 1.5% שומן',
  'דנונה',
  'יוגורטים ומעדנים',
  70,
  10,
  3.4,
  1.5,
  3.4,
  35,
  99,
  200,
  'גביע',
  'גביע 200 גרם',
  'מאושר',
  'ערכים ל-100 גרם לפי דנונה; סה״כ לגביע: 140 קלוריות, 20 גרם חלבון, 6.8 גרם פחמימות, 3 גרם שומן, 6.8 גרם סוכרים, 70 מ״ג נתרן ו-198 מ״ג סידן.',
  'https://danone.strauss-group.com/product/%d7%93%d7%a0%d7%95%d7%a0%d7%94-pro/',
  200,
  140,
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
    select 1 from public.foods
    where id = '341'
      and calories = 70
      and protein = 10
      and serving_label = 'גביע 200 גרם'
      and unit_weight_grams = 200
      and calories_per_unit = 140
  ) then
    raise exception 'danone_pro_example_upsert_failed';
  end if;
end $$;

commit;
