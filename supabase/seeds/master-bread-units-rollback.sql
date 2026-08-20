-- Undoes 202608200003. Removes the two breads added on 2026-08-20.
-- A menu that already uses one of them would lose its food reference, so this is
-- only safe while neither has been put on a plan.

begin;
delete from public.foods where id in ('master-c-019', 'master-c-020');
notify pgrst, 'reload schema';
commit;
