begin;

create table public.workout_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.workout_assignments(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null references public.workout_programs(id) on delete restrict,
  day_id text not null references public.workout_program_days(id) on delete restrict,
  original_date date not null,
  scheduled_date date not null,
  moved_at timestamptz not null default now(),
  check (scheduled_date >= original_date),
  unique (assignment_id, original_date)
);
create index workout_schedule_changes_client_date_idx on public.workout_schedule_changes(client_id, scheduled_date);
create index workout_schedule_changes_assignment_original_idx on public.workout_schedule_changes(assignment_id, original_date);

alter table public.workout_schedule_changes enable row level security;
create policy workout_schedule_changes_participant_read on public.workout_schedule_changes for select to authenticated using (client_id = (select auth.uid()) or public.is_coach_for(client_id));
revoke all on table public.workout_schedule_changes from anon, authenticated;
grant select on table public.workout_schedule_changes to authenticated;

create or replace function public.move_scheduled_workout(p_assignment_id uuid, p_day_id text, p_original_date date, p_new_date date, p_confirm_conflict boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_assignment public.workout_assignments%rowtype; v_conflict boolean; v_result jsonb;
begin
  if public.current_role() <> 'client' or auth.uid() is null or p_new_date < timezone('Asia/Jerusalem', now())::date or p_original_date < timezone('Asia/Jerusalem', now())::date then raise exception 'invalid_workout_move_date'; end if;
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

create or replace function public.ensure_workout_day_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_now timestamp := timezone('Asia/Jerusalem', now()); v_today date := v_now::date; v_time time := v_now::time; v_assignment public.workout_assignments%rowtype; v_change public.workout_schedule_changes%rowtype; v_morning_enabled boolean := true; v_evening_enabled boolean := true; v_morning_time time := time '08:00'; v_evening_time time := time '19:30';
begin
  if v_user_id is null or public.current_role() <> 'client' or not public.notification_enabled(v_user_id, 'reminders') or not public.notification_enabled(v_user_id, 'workouts') then return; end if;
  select * into v_assignment from public.workout_assignments where client_id = v_user_id and status = 'active' and start_date <= v_today and (end_date is null or end_date >= v_today) limit 1;
  if not found then return; end if;
  select * into v_change from public.workout_schedule_changes where assignment_id = v_assignment.id and scheduled_date = v_today limit 1;
  if not found and (exists(select 1 from public.workout_schedule_changes where assignment_id = v_assignment.id and original_date = v_today) or not public.workout_is_planned_on(v_assignment, v_today)) then return; end if;
  if exists(select 1 from public.workout_sessions where client_id = v_user_id and assignment_id = v_assignment.id and status = 'completed' and (completed_at at time zone 'Asia/Jerusalem')::date = v_today) then return; end if;
  select workout_morning_reminder, workout_evening_reminder, workout_morning_reminder_time, workout_evening_reminder_time into v_morning_enabled, v_evening_enabled, v_morning_time, v_evening_time from public.notification_preferences where user_id = v_user_id;
  if v_morning_enabled and v_time >= v_morning_time and v_time < v_evening_time then perform public.create_in_app_notification(v_user_id, null, 'reminders', 'workout_morning_reminder', 'יש לך אימון היום 💪', 'האימון שלך מחכה לך. תכנן מתי אתה עושה אותו היום.', '/workouts', 'workout_assignments', v_assignment.id::text, 'workout-morning-' || v_assignment.id::text || '-' || v_today::text); end if;
  if v_evening_enabled and v_time >= v_evening_time then perform public.create_in_app_notification(v_user_id, null, 'reminders', 'workout_evening_reminder', 'עוד לא סימנת את האימון של היום', 'נשאר לך לסגור את האימון לפני שהיום נגמר.', '/workouts', 'workout_assignments', v_assignment.id::text, 'workout-evening-' || v_assignment.id::text || '-' || v_today::text); end if;
end $$;

revoke all on function public.move_scheduled_workout(uuid,text,date,date,boolean) from public;
grant execute on function public.move_scheduled_workout(uuid,text,date,date,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
