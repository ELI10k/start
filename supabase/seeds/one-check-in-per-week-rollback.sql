-- Undoes 202608210004. Removes the guard and its helpers; nothing stored changes.

begin;

drop trigger if exists check_ins_one_per_week_trigger on public.check_ins;
drop function if exists public.check_ins_one_per_week();
drop function if exists public.check_in_week_state();
drop function if exists public.israel_week_start(timestamptz);

-- Note: this does not restore the daily guard that briefly preceded it. That was
-- a decision reversed on the day, not a state worth returning to.

notify pgrst, 'reload schema';
commit;
