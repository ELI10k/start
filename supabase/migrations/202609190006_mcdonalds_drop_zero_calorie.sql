-- Espresso, americano, water, soda and Coke Zero came in at 0 or 1 calories a
-- serving. Eli asked for them out of the catalogue.
begin;

delete from public.foods
where brand = 'מקדונלד''ס'
  and calories_per_unit <= 1;

do $$
begin
  if (select count(*) from public.foods where category = 'מקדונלד''ס') <> 140 then
    raise exception 'mcdonalds_zero_calorie_cleanup_failed';
  end if;
end $$;

commit;
