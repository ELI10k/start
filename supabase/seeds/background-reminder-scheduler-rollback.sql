begin;

-- Rollback for 202608020002_background_reminder_scheduler.sql.
-- Drops the batch entry point and the per-client rules, then restores the two
-- original zero-argument functions to exactly the bodies they had before the
-- migration. Reminders go back to being generated only when a client opens the
-- notifications page. No notification rows are deleted.

drop function if exists public.run_scheduled_reminders();
drop function if exists public.ensure_in_app_reminders_for_client(uuid);
drop function if exists public.ensure_workout_day_reminders_for_client(uuid);

create or replace function public.ensure_in_app_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_week text := to_char(current_date, 'IYYY-IW');
begin
  if v_user_id is null or public.current_role() <> 'client' or not public.notification_enabled(v_user_id, 'reminders') then return; end if;
  if not exists(select 1 from public.check_ins where client_id = v_user_id and submitted_at >= now() - interval '7 days') then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'check_in_reminder', 'תזכורת לצ׳ק-אין', 'הגיע הזמן לעדכן איך עבר עליך השבוע.', '/check-in', 'reminders', v_week, 'check-in-reminder-' || v_week);
  end if;
  if not exists(select 1 from public.progress_entries where client_id = v_user_id and date >= current_date - 7) then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'weight_reminder', 'תזכורת להזנת משקל', 'מדידה עדכנית עוזרת למעקב ולתוכנית שלך.', '/progress', 'reminders', v_week, 'weight-reminder-' || v_week);
  end if;
end $$;

create or replace function public.ensure_workout_day_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamp := timezone('Asia/Jerusalem', now());
  v_today date := v_now::date;
  v_time time := v_now::time;
  v_assignment public.workout_assignments%rowtype;
  v_morning_enabled boolean := true;
  v_evening_enabled boolean := true;
  v_morning_time time := time '08:00';
  v_evening_time time := time '19:30';
begin
  if v_user_id is null or public.current_role() <> 'client' or not public.notification_enabled(v_user_id, 'reminders') or not public.notification_enabled(v_user_id, 'workouts') then return; end if;
  select * into v_assignment from public.workout_assignments where client_id = v_user_id and status = 'active' and start_date <= v_today and (end_date is null or end_date >= v_today) limit 1;
  if not found or not public.workout_is_planned_on(v_assignment, v_today) then return; end if;
  if exists(select 1 from public.workout_sessions where client_id = v_user_id and assignment_id = v_assignment.id and status = 'completed' and (completed_at at time zone 'Asia/Jerusalem')::date = v_today) then return; end if;
  select workout_morning_reminder, workout_evening_reminder, workout_morning_reminder_time, workout_evening_reminder_time
    into v_morning_enabled, v_evening_enabled, v_morning_time, v_evening_time
  from public.notification_preferences where user_id = v_user_id;
  if v_morning_enabled and v_time >= v_morning_time and v_time < v_evening_time then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'workout_morning_reminder', 'יש לך אימון היום 💪', 'האימון שלך מחכה לך. תכנן מתי אתה עושה אותו היום.', '/workouts', 'workout_assignments', v_assignment.id::text, 'workout-morning-' || v_assignment.id::text || '-' || v_today::text);
  end if;
  if v_evening_enabled and v_time >= v_evening_time then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'workout_evening_reminder', 'עוד לא סימנת את האימון של היום', 'נשאר לך לסגור את האימון לפני שהיום נגמר.', '/workouts', 'workout_assignments', v_assignment.id::text, 'workout-evening-' || v_assignment.id::text || '-' || v_today::text);
  end if;
end $$;

grant execute on function public.ensure_in_app_reminders(), public.ensure_workout_day_reminders() to authenticated;

notify pgrst, 'reload schema';
commit;
