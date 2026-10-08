begin;

-- A Medjool date is shown and selected as one 30 g unit. Nutrition remains
-- stored per 100 g; catalogue and menu calculations scale it through the unit.
update public.foods
set name = 'תמר מג׳הול',
    package_unit = 'תמר',
    unit_weight_grams = 30,
    serving_label = '1 תמר (30 גרם)',
    calories_per_unit = round(calories * 30 / 100, 3),
    updated_at = now()
where id = 'master-c-015';

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = 'master-c-015'
      and name = 'תמר מג׳הול'
      and package_unit = 'תמר'
      and unit_weight_grams = 30
      and serving_label = '1 תמר (30 גרם)'
  ) then
    raise exception 'medjool_date_serving_update_failed';
  end if;
end $$;

commit;
