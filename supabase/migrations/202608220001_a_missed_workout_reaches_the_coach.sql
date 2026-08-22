-- A missed workout is news for the coach, not for the person who just declared it.
--
-- skip_scheduled_workout wrote its notification to auth.uid() - the client - so
-- marking "פיספסתי אימון" told the client something they had said themselves a
-- second earlier, and told the coach nothing at all. The one fact the coach
-- needs from this action never left the client's phone.
--
-- Every active coach of that client gets it, the same way a new check-in is
-- announced, and it links to their client file rather than to /workouts, which
-- is a client screen. The client keeps the row on their schedule and the "דולג"
-- state on their own screen; what they lose is a notification about their own
-- tap.
--
-- The dedupe key carries the coach id as well as the change id, so two coaches
-- on one client each get one - the key is unique per recipient, and without the
-- coach in it the second coach's row would collide with the first's and vanish.
--
-- Impact: one function replaced. Same signature, same arguments, same writes to
-- workout_schedule_changes and workout_reminder_snoozes - only the notification
-- recipient changes. No table, policy or constraint changes.
--
-- Rollback: supabase/seeds/a-missed-workout-reaches-the-coach-rollback.sql

begin;

create or replace function public.skip_scheduled_workout(p_assignment_id uuid,p_day_id text,p_date date,p_reason text default '') returns void language plpgsql security definer set search_path=public as $$
declare v_change_id uuid; v_coach_id uuid; v_client_id uuid := auth.uid(); v_reason text := nullif(trim(p_reason),'');
begin
 if public.current_role()<>'client' or p_date<timezone('Asia/Jerusalem',now())::date then raise exception 'invalid_skip'; end if;
 if exists(select 1 from public.workout_sessions where assignment_id=p_assignment_id and day_id=p_day_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date=p_date) then raise exception 'completed_workout_cannot_skip'; end if;
 insert into public.workout_schedule_changes(assignment_id,client_id,program_id,day_id,original_date,scheduled_date,status,skipped_at,skipped_reason,changed_by)
 select a.id,v_client_id,a.program_id,p_day_id,p_date,p_date,'skipped',now(),v_reason,v_client_id from public.workout_assignments a where a.id=p_assignment_id and a.client_id=v_client_id and a.status='active'
 on conflict(assignment_id,original_date) do update set status='skipped',skipped_at=now(),skipped_reason=v_reason,changed_by=v_client_id returning id into v_change_id;
 if v_change_id is null then raise exception 'workout_not_planned'; end if;
 update public.workout_reminder_snoozes set active=false where assignment_id=p_assignment_id and scheduled_date=p_date;
 for v_coach_id in select coach_id from public.coach_client_relationships where client_id=v_client_id and status='active' loop
   perform public.create_in_app_notification(
     v_coach_id, v_client_id, 'workouts', 'workout_skipped',
     'לקוח סימן שפיספס אימון',
     coalesce(v_reason,'לא נמסרה סיבה.'),
     '/coach/clients/'||v_client_id::text,
     'workout_schedule_changes', v_change_id::text,
     'workout-skipped-'||v_change_id::text||'-'||v_coach_id::text);
 end loop;
end $$;

revoke all on function public.skip_scheduled_workout(uuid,text,date,text) from public;
grant execute on function public.skip_scheduled_workout(uuid,text,date,text) to authenticated;

notify pgrst, 'reload schema';
commit;
