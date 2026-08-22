-- Rollback for 202608220001_a_missed_workout_reaches_the_coach.
-- Restores the notification to the client, as 202607210002 wrote it.
begin;
create or replace function public.skip_scheduled_workout(p_assignment_id uuid,p_day_id text,p_date date,p_reason text default '') returns void language plpgsql security definer set search_path=public as $$
declare v_change_id uuid;
begin
 if public.current_role()<>'client' or p_date<timezone('Asia/Jerusalem',now())::date then raise exception 'invalid_skip'; end if;
 if exists(select 1 from public.workout_sessions where assignment_id=p_assignment_id and day_id=p_day_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date=p_date) then raise exception 'completed_workout_cannot_skip'; end if;
 insert into public.workout_schedule_changes(assignment_id,client_id,program_id,day_id,original_date,scheduled_date,status,skipped_at,skipped_reason,changed_by)
 select a.id,auth.uid(),a.program_id,p_day_id,p_date,p_date,'skipped',now(),nullif(trim(p_reason),''),auth.uid() from public.workout_assignments a where a.id=p_assignment_id and a.client_id=auth.uid() and a.status='active'
 on conflict(assignment_id,original_date) do update set status='skipped',skipped_at=now(),skipped_reason=nullif(trim(p_reason),''),changed_by=auth.uid() returning id into v_change_id;
 if v_change_id is null then raise exception 'workout_not_planned'; end if;
 update public.workout_reminder_snoozes set active=false where assignment_id=p_assignment_id and scheduled_date=p_date;
 perform public.create_in_app_notification(auth.uid(),null,'workouts','workout_skipped','אימון סומן כדולג',coalesce(nullif(trim(p_reason),''),'האימון נשאר בהיסטוריה כדולג.'),'/workouts','workout_schedule_changes',v_change_id::text,'workout-skipped-'||v_change_id::text);
end $$;
notify pgrst, 'reload schema';
commit;
