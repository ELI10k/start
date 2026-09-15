begin;

update public.foods
set
  package_quantity = 200,
  package_unit = 'גביע',
  serving_label = 'גביע 200 גרם',
  unit_weight_grams = 200,
  calories_per_unit = case id when '31' then 144 when '32' then 172 end,
  units_per_package = 1,
  notes = case id
    when '31' then 'גביע אחד של 200 גרם; סה״כ לגביע: 144 קלוריות, 20 גרם חלבון, 7 גרם פחמימות ו-4 גרם שומן'
    when '32' then 'גביע אחד של 200 גרם; סה״כ לגביע: 172 קלוריות, 25 גרם חלבון, 8.8 גרם פחמימות ו-4 גרם שומן'
  end,
  updated_at = now()
where id in ('31', '32');

do $$
begin
  if (select count(*) from public.foods
      where id in ('31', '32')
        and package_unit = 'גביע'
        and serving_label = 'גביע 200 גרם'
        and unit_weight_grams = 200
        and units_per_package = 1) <> 2 then
    raise exception 'yoplait_go_cup_serving_update_failed';
  end if;
end $$;

commit;
