begin;

-- Open Food Facts supplies these figures per 100 ml. Both rows were labelled
-- "350 ml" without a natural unit, so the catalogue displayed the per-100 ml
-- figures beside a whole-bottle label. Keep the normalized nutrition columns
-- unchanged and describe the countable 350 ml bottle explicitly.
update public.foods
set
  package_quantity = 350,
  package_unit = 'בקבוק',
  unit_weight_grams = 350,
  serving_label = 'בקבוק 350 מ״ל',
  calories_per_unit = calories * 3.5,
  units_per_package = 1,
  updated_at = now()
where id in (
  'barcode-7290119387465',
  'barcode-7290119387472'
);

do $$
begin
  if (select count(*)
      from public.foods
      where id in (
        'barcode-7290119387465',
        'barcode-7290119387472'
      )
        and package_quantity = 350
        and package_unit = 'בקבוק'
        and unit_weight_grams = 350
        and serving_label = 'בקבוק 350 מ״ל'
        and calories_per_unit = calories * 3.5
        and units_per_package = 1) <> 2 then
    raise exception 'yotvata_pro_coffee_bottle_serving_update_failed';
  end if;
end $$;

commit;
