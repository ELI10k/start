begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'meal_plan_assigned', 'workout_assigned', 'check_in_submitted', 'check_in_reviewed', 'progress_updated',
  'check_in_reminder', 'weight_reminder', 'content_published', 'workout_morning_reminder', 'workout_evening_reminder'
));

alter table public.notification_preferences
  add column workout_morning_reminder boolean not null default true,
  add column workout_evening_reminder boolean not null default true,
  add column workout_morning_reminder_time time not null default time '08:00',
  add column workout_evening_reminder_time time not null default time '19:30',
  add constraint notification_preferences_workout_reminder_times_check
    check (workout_morning_reminder_time < workout_evening_reminder_time);

create or replace function public.workout_is_planned_on(p_assignment public.workout_assignments, p_date date)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_preferred_days smallint[];
begin
  if p_assignment.status <> 'active' or p_date < p_assignment.start_date or (p_assignment.end_date is not null and p_date > p_assignment.end_date) then return false; end if;
  select preferred_days into v_preferred_days from public.workout_preferences where client_id = p_assignment.client_id;
  if coalesce(cardinality(v_preferred_days), 0) > 0 then
    return extract(dow from p_date)::smallint = any(v_preferred_days);
  end if;
  return mod(p_date - p_assignment.start_date, 7) < p_assignment.weekly_frequency;
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

create or replace function public.ensure_in_app_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_week text := to_char(timezone('Asia/Jerusalem', now())::date, 'IYYY-IW');
begin
  if v_user_id is null or public.current_role() <> 'client' or not public.notification_enabled(v_user_id, 'reminders') then return; end if;
  if not exists(select 1 from public.check_ins where client_id = v_user_id and submitted_at >= now() - interval '7 days') then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'check_in_reminder', 'תזכורת לצ׳ק-אין', 'הגיע הזמן לעדכן איך עבר עליך השבוע.', '/check-in', 'reminders', v_week, 'check-in-reminder-' || v_week);
  end if;
  if not exists(select 1 from public.progress_entries where client_id = v_user_id and date >= timezone('Asia/Jerusalem', now())::date - 7) then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'weight_reminder', 'תזכורת להזנת משקל', 'מדידה עדכנית עוזרת למעקב ולתוכנית שלך.', '/progress', 'reminders', v_week, 'weight-reminder-' || v_week);
  end if;
  perform public.ensure_workout_day_reminders();
end $$;

drop function public.save_notification_preferences(boolean, boolean, boolean, boolean, boolean);
create function public.save_notification_preferences(
  p_nutrition boolean, p_workouts boolean, p_check_ins boolean, p_content boolean, p_reminders boolean,
  p_workout_morning_reminder boolean, p_workout_evening_reminder boolean,
  p_workout_morning_reminder_time time, p_workout_evening_reminder_time time
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_workout_morning_reminder_time >= p_workout_evening_reminder_time then raise exception 'invalid_workout_reminder_times'; end if;
  insert into public.notification_preferences(user_id, nutrition, workouts, check_ins, content, reminders, workout_morning_reminder, workout_evening_reminder, workout_morning_reminder_time, workout_evening_reminder_time)
  values(auth.uid(), p_nutrition, p_workouts, p_check_ins, p_content, p_reminders, p_workout_morning_reminder, p_workout_evening_reminder, p_workout_morning_reminder_time, p_workout_evening_reminder_time)
  on conflict(user_id) do update set nutrition = excluded.nutrition, workouts = excluded.workouts, check_ins = excluded.check_ins, content = excluded.content, reminders = excluded.reminders, workout_morning_reminder = excluded.workout_morning_reminder, workout_evening_reminder = excluded.workout_evening_reminder, workout_morning_reminder_time = excluded.workout_morning_reminder_time, workout_evening_reminder_time = excluded.workout_evening_reminder_time, updated_at = now();
end $$;

revoke all on function public.ensure_workout_day_reminders(), public.workout_is_planned_on(public.workout_assignments, date), public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,time,time) from public;
grant execute on function public.ensure_workout_day_reminders(), public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,time,time) to authenticated;

notify pgrst, 'reload schema';
commit;
