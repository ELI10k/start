-- Undoes 202608200005. Drops the column that lets a draft remember who it is
-- for; every unassigned draft goes back to reading "ללא שיוך" when reopened.
-- save_meal_plan_tree must be restored from 202608200004 first, or it will fail
-- on a column that no longer exists.

begin;
drop index if exists public.meal_plans_intended_client_idx;
alter table public.meal_plans drop column if exists intended_client_id;
notify pgrst, 'reload schema';
commit;
