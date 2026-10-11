begin;

-- The supplied nutrition values describe one 85 g microwave bag. The foods
-- table remains normalized per 100 g; the natural "bag" unit makes catalogue
-- and menu screens show the supplied whole-bag values.
insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat,
  package_quantity, package_unit, serving_label, verification_status, notes,
  unit_weight_grams, calories_per_unit, units_per_package, source
) values (
  'hotpop-reduced-fat-85g',
  'פופקורן מופחת שומן להכנה במיקרו',
  'Hot Pop',
  'חטיפים מלוחים',
  356.470588,
  10,
  55.058824,
  8,
  85,
  'שקית',
  'שקית 85 גרם',
  'ממתין לבדיקה',
  'ערכים שנמסרו על ידי המשתמש; סה״כ לשקית 85 גרם: 303 קלוריות, 8.5 גרם חלבון, 46.8 גרם פחמימות ו-6.8 גרם שומן.',
  85,
  303,
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
  package_quantity = excluded.package_quantity,
  package_unit = excluded.package_unit,
  serving_label = excluded.serving_label,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
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
    where id = 'hotpop-reduced-fat-85g'
      and name = 'פופקורן מופחת שומן להכנה במיקרו'
      and brand = 'Hot Pop'
      and unit_weight_grams = 85
      and calories_per_unit = 303
      and round(protein * 0.85, 1) = 8.5
      and round(carbs * 0.85, 1) = 46.8
      and round(fat * 0.85, 1) = 6.8
  ) then
    raise exception 'hotpop_reduced_fat_85g_upsert_failed';
  end if;
end $$;

commit;
