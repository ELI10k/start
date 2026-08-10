begin;

-- Changing how often one client trains should not require re-assigning the
-- programme. Re-assigning archives the running assignment, which throws away
-- the adherence history and every scheduled move attached to it, so a coach who
-- only wanted to go from three sessions a week to four paid for it with the
-- client's record.
--
-- Additive: one new function, no schema change.
--
-- Rollback: drop function public.set_workout_assignment_frequency(uuid,smallint);

create or replace function public.set_workout_assignment_frequency(p_assignment_id uuid, p_weekly_frequency smallint)
returns void language plpgsql security definer set search_path=public as $$
declare v_client_id uuid; v_status public.workout_assignment_status;
begin
  select client_id, status into v_client_id, v_status from public.workout_assignments where id=p_assignment_id;
  if v_client_id is null or public.current_role()<>'coach' or not public.is_coach_for(v_client_id) then raise exception 'not_authorized'; end if;
  if v_status not in ('active','paused') then raise exception 'assignment_not_editable'; end if;
  if p_weekly_frequency is null or p_weekly_frequency<1 or p_weekly_frequency>7 then raise exception 'invalid_frequency'; end if;
  update public.workout_assignments set weekly_frequency=p_weekly_frequency where id=p_assignment_id;
end $$;

revoke all on function public.set_workout_assignment_frequency(uuid,smallint) from public;
grant execute on function public.set_workout_assignment_frequency(uuid,smallint) to authenticated;

commit;
