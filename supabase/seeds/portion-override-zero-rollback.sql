-- Undoes 202608200008. Any "I ate none of it" already recorded is cleared,
-- because the narrower constraint cannot hold it.

begin;
update public.meal_group_selections set amount_override = null where amount_override = 0;
alter table public.meal_group_selections drop constraint if exists meal_group_selections_amount_override_check;
alter table public.meal_group_selections add constraint meal_group_selections_amount_override_check
  check (amount_override is null or amount_override > 0);
notify pgrst, 'reload schema';
commit;
