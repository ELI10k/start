begin;

insert into public.foods(
  id,name,brand,category,calories,protein,carbs,fat,package_quantity,
  package_unit,barcode,serving_label,verification_status,unit_weight_grams,
  calories_per_unit,units_per_package,notes
) values (
  'barcode-7290018659373','אבקת חלבון','אולטרה לאבס','אבקות חלבון',
  352.941176,73.529412,8.823529,4.117647,1,'סקופ','7290018659373',
  'סקופ 34 גרם','מאושר',34,120,1,
  'ערכים למנה של סקופ 34 גרם: 120 קלוריות, 25 גרם חלבון, 3 גרם פחמימות ו-1.4 גרם שומן'
)
on conflict(id) do update set
  name=excluded.name,brand=excluded.brand,category=excluded.category,
  calories=excluded.calories,protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,
  package_quantity=excluded.package_quantity,package_unit=excluded.package_unit,
  barcode=coalesce(public.foods.barcode,excluded.barcode),serving_label=excluded.serving_label,
  verification_status=coalesce(public.foods.verification_status,excluded.verification_status),
  unit_weight_grams=excluded.unit_weight_grams,calories_per_unit=excluded.calories_per_unit,
  units_per_package=excluded.units_per_package,notes=excluded.notes,updated_at=now();

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = 'barcode-7290018659373'
      and name = 'אבקת חלבון'
      and package_unit = 'סקופ'
      and serving_label = 'סקופ 34 גרם'
      and unit_weight_grams = 34
      and calories_per_unit = 120
  ) then
    raise exception 'ultralabs_whey_scoop_serving_update_failed';
  end if;
end $$;

commit;
