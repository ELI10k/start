begin;

update public.foods
set
  name = 'יוגורט חלבון מולר 25 גרם חלבון',
  brand = 'מולר',
  package_quantity = 200,
  package_unit = 'גביע',
  serving_label = 'גביע 200 גרם',
  unit_weight_grams = 200,
  calories_per_unit = 130,
  units_per_package = 1,
  updated_at = now()
where id = '340';

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = '340'
      and name = 'יוגורט חלבון מולר 25 גרם חלבון'
      and brand = 'מולר'
      and serving_label = 'גביע 200 גרם'
      and unit_weight_grams = 200
      and calories_per_unit = 130
  ) then
    raise exception 'muller_yogurt_cup_serving_update_failed';
  end if;
end $$;

commit;
