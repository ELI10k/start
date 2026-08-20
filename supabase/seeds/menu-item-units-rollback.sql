-- Undoes 202608200004. Narrows the unit back to the three values it allowed
-- before and collapses every stored label into them, which is lossy: a row that
-- says "פיתה" becomes "גרם" and the client goes back to reading a unit count as
-- a gram count. Only worth running if something outside this repository depends
-- on the narrow constraint.

begin;

update public.meal_items set measurement_unit = 'גרם'
where measurement_unit not in ('g', 'גרם', 'יחידות');

alter table public.meal_items drop constraint if exists meal_items_measurement_unit_check;
alter table public.meal_items add constraint meal_items_measurement_unit_check
  check(measurement_unit in ('g','גרם','יחידות'));

notify pgrst, 'reload schema';
commit;
