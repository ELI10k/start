-- Rollback for 202608190005_master_foods_survive_use.sql.
--
-- Restores NOT NULL and the false default, and puts back the insert that wrote
-- manual_favorite on first selection. The nulls become false, which reinstates
-- the original behaviour - a curated master food drops out of favourites as soon
-- as it is used.

begin;

update public.coach_food_usage set manual_favorite = false where manual_favorite is null;

alter table public.coach_food_usage alter column manual_favorite set default false;
alter table public.coach_food_usage alter column manual_favorite set not null;

create or replace function public.record_coach_food_selection(p_food_id text) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  if not exists(select 1 from public.foods where id=p_food_id) then raise exception 'food_not_found'; end if;
  insert into public.coach_food_usage(coach_id,food_id,selection_count,last_used_at)
  values(auth.uid(),p_food_id,1,now())
  on conflict(coach_id,food_id) do update set
    selection_count=public.coach_food_usage.selection_count+1,last_used_at=now();
end $$;

notify pgrst, 'reload schema';
commit;
