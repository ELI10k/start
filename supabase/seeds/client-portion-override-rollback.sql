-- Undoes 202608200006. Every recorded "I ate less than that" is discarded and
-- the day reads as though every portion was eaten exactly as prescribed.

begin;
drop function if exists public.set_meal_group_amount(uuid, date, numeric);
alter table public.meal_group_selections drop column if exists amount_override;
notify pgrst, 'reload schema';
commit;
