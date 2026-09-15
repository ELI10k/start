begin;

update public.foods
set
  name = 'אבקת חלבון',
  brand = 'אולטרה לאבס',
  category = 'אבקות חלבון',
  calories = 352.941176,
  protein = 73.529412,
  carbs = 8.823529,
  fat = 4.117647,
  package_quantity = 1,
  package_unit = 'סקופ',
  serving_label = 'סקופ 34 גרם',
  unit_weight_grams = 34,
  calories_per_unit = 120,
  units_per_package = 1,
  notes = 'ערכים למנה של סקופ 34 גרם: 120 קלוריות, 25 גרם חלבון, 3 גרם פחמימות ו-1.4 גרם שומן',
  updated_at = now()
where id = 'barcode-7290018659373';

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
