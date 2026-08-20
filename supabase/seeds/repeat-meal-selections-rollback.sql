-- Undoes 202608200002. Removes the "same as yesterday" copier. No data is
-- touched: the selections it created are ordinary rows and stay exactly as they
-- are, indistinguishable from choices made by hand.

begin;
drop function if exists public.repeat_meal_group_selections(date, date);
notify pgrst, 'reload schema';
commit;
