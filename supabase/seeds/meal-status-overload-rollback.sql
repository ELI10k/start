-- Undoes 202608200001. Restores the three-argument wrapper beside the
-- four-argument one, which is the ambiguous state that migration removed - so
-- this is only worth running if something outside this repository turns out to
-- depend on the three-argument signature existing.

begin;

create or replace function public.set_meal_day_status(p_meal_id uuid, p_date date, p_status text)
returns uuid
language plpgsql security invoker set search_path=public as $$
begin
  return public.set_meal_day_status(p_meal_id, p_date, p_status, null);
end $$;

create or replace function public.set_meal_eaten(p_meal_id uuid, p_date date, p_eaten boolean)
returns uuid
language plpgsql security invoker set search_path=public as $$
begin
  return public.set_meal_day_status(p_meal_id, p_date, case when p_eaten then 'eaten' else 'none' end);
end $$;

notify pgrst, 'reload schema';
commit;
