begin;
delete from public.foods where id like 'master-%';
notify pgrst, 'reload schema';
commit;
