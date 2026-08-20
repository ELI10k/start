-- Undoes 202608200007. Every entry a client recorded about what they actually
-- ate is deleted, and the photographs are orphaned in storage - remove the
-- food-log-photos bucket by hand if that is intended too.

begin;
drop function if exists public.delete_client_food_log(uuid);
drop function if exists public.log_client_food(date,text,text,uuid,text,numeric,text,numeric,numeric,numeric,numeric,text);
drop policy if exists food_log_photo_coach_read on storage.objects;
drop policy if exists food_log_photo_client_delete on storage.objects;
drop policy if exists food_log_photo_client_read on storage.objects;
drop policy if exists food_log_photo_client_write on storage.objects;
drop table if exists public.client_food_log;
notify pgrst, 'reload schema';
commit;
