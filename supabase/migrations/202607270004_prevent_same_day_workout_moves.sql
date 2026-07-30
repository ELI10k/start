begin;

create or replace function public.move_scheduled_workout(p_assignment_id uuid, p_day_id text, p_original_date date, p_new_date date, p_confirm_conflict boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_assignment public.workout_assignments%rowtype; v_conflict boolean; v_result jsonb;
begin
  if public.current_role() <> 'client' or auth.uid() is null or p_new_date <= p_original_date or p_new_date < timezone('Asia/Jerusalem', now())::date or p_original_date < timezone('Asia/Jerusalem', now())::date then raise exception 'invalid_workout_move_date'; end if;
  select * into v_assignment from public.workout_assignments where id = p_assignment_id and client_id = auth.uid() and status = 'active';
  if not found or not public.workout_is_planned_on(v_assignment, p_original_date) then raise exception 'workout_not_planned'; end if;
  if not exists(select 1 from public.workout_program_days where id = p_day_id and program_id = v_assignment.program_id) then raise exception 'invalid_workout_day'; end if;
  if exists(select 1 from public.workout_sessions where assignment_id = p_assignment_id and day_id = p_day_id and status = 'completed' and (completed_at at time zone 'Asia/Jerusalem')::date = p_original_date) then raise exception 'completed_workout_cannot_move'; end if;
  select exists(
    select 1 from public.workout_schedule_changes c where c.client_id = auth.uid() and c.scheduled_date = p_new_date and not (c.assignment_id = p_assignment_id and c.original_date = p_original_date)
    union all
    select 1 where public.workout_is_planned_on(v_assignment, p_new_date) and not exists(select 1 from public.workout_schedule_changes c where c.assignment_id = p_assignment_id and c.original_date = p_new_date)
  ) into v_conflict;
  if v_conflict and not p_confirm_conflict then return jsonb_build_object('ok', false, 'conflict', true); end if;
  insert into public.workout_schedule_changes(assignment_id, client_id, program_id, day_id, original_date, scheduled_date)
  values(v_assignment.id, auth.uid(), v_assignment.program_id, p_day_id, p_original_date, p_new_date)
  on conflict(assignment_id, original_date) do update set scheduled_date = excluded.scheduled_date, day_id = excluded.day_id, moved_at = now()
  returning jsonb_build_object('ok', true, 'conflict', v_conflict, 'originalDate', original_date, 'scheduledDate', scheduled_date, 'movedAt', moved_at) into v_result;
  return v_result;
end $$;

revoke all on function public.move_scheduled_workout(uuid,text,date,date,boolean) from public;
grant execute on function public.move_scheduled_workout(uuid,text,date,date,boolean) to authenticated;
notify pgrst, 'reload schema';

commit;
