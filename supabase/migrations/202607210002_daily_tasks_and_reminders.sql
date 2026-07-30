begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('meal_plan_assigned','workout_assigned','check_in_submitted','check_in_reviewed','progress_updated','check_in_reminder','weight_reminder','content_published','workout_morning_reminder','workout_evening_reminder','workout_snooze','workout_skipped','workout_moved','meal_reminder','end_of_day_reminder','weekly_achievement'));
alter table public.notifications add column metadata jsonb not null default '{}'::jsonb;
alter table public.notification_preferences add column meal_reminders boolean not null default true, add column meal_reminder_delay_minutes smallint not null default 60 check(meal_reminder_delay_minutes between 1 and 240), add column end_of_day_reminder boolean not null default true, add column end_of_day_reminder_time time not null default time '21:30';

alter table public.workout_schedule_changes add column status text not null default 'planned' check(status in ('planned','skipped')), add column skipped_at timestamptz, add column skipped_reason text check(skipped_reason is null or length(trim(skipped_reason))<=500), add column changed_by uuid references public.profiles(id) on delete set null;
update public.workout_schedule_changes set changed_by=client_id where changed_by is null;

create table public.workout_reminder_snoozes (id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.workout_assignments(id) on delete cascade, client_id uuid not null references public.profiles(id) on delete cascade, schedule_change_id uuid references public.workout_schedule_changes(id) on delete cascade, scheduled_date date not null, due_at timestamptz not null, active boolean not null default true, created_at timestamptz not null default now(), unique(assignment_id,scheduled_date,active));
create table public.weekly_achievements (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id) on delete cascade, week_start date not null, week_end date not null, created_at timestamptz not null default now(), unique(client_id,week_start,week_end));
alter table public.workout_reminder_snoozes enable row level security; alter table public.weekly_achievements enable row level security;
create policy workout_snoozes_participant on public.workout_reminder_snoozes for select to authenticated using(client_id=auth.uid() or public.is_coach_for(client_id));
create policy achievements_participant on public.weekly_achievements for select to authenticated using(client_id=auth.uid() or public.is_coach_for(client_id));
revoke all on public.workout_reminder_snoozes, public.weekly_achievements from anon,authenticated; grant select on public.workout_reminder_snoozes,public.weekly_achievements to authenticated;

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

create or replace function public.snooze_scheduled_workout(p_assignment_id uuid,p_date date) returns void language plpgsql security definer set search_path=public as $$
begin
 if public.current_role()<>'client' or exists(select 1 from public.workout_schedule_changes where assignment_id=p_assignment_id and scheduled_date=p_date and status='skipped') or exists(select 1 from public.workout_sessions where assignment_id=p_assignment_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date=p_date) then raise exception 'workout_not_snoozable'; end if;
 update public.workout_reminder_snoozes set active=false where assignment_id=p_assignment_id and scheduled_date=p_date and active;
 insert into public.workout_reminder_snoozes(assignment_id,client_id,scheduled_date,due_at) values(p_assignment_id,auth.uid(),p_date,now()+interval '60 minutes') on conflict(assignment_id,scheduled_date,active) do update set due_at=excluded.due_at,created_at=now();
end $$;

create or replace function public.save_notification_preferences(p_nutrition boolean,p_workouts boolean,p_check_ins boolean,p_content boolean,p_reminders boolean,p_workout_morning_reminder boolean,p_workout_evening_reminder boolean,p_workout_morning_reminder_time time,p_workout_evening_reminder_time time,p_meal_reminders boolean,p_meal_reminder_delay_minutes smallint,p_end_of_day_reminder boolean,p_end_of_day_reminder_time time) returns void language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or p_workout_morning_reminder_time>=p_workout_evening_reminder_time or p_meal_reminder_delay_minutes not between 1 and 240 then raise exception 'invalid_notification_preferences'; end if;
 insert into public.notification_preferences(user_id,nutrition,workouts,check_ins,content,reminders,workout_morning_reminder,workout_evening_reminder,workout_morning_reminder_time,workout_evening_reminder_time,meal_reminders,meal_reminder_delay_minutes,end_of_day_reminder,end_of_day_reminder_time) values(auth.uid(),p_nutrition,p_workouts,p_check_ins,p_content,p_reminders,p_workout_morning_reminder,p_workout_evening_reminder,p_workout_morning_reminder_time,p_workout_evening_reminder_time,p_meal_reminders,p_meal_reminder_delay_minutes,p_end_of_day_reminder,p_end_of_day_reminder_time) on conflict(user_id) do update set nutrition=excluded.nutrition,workouts=excluded.workouts,check_ins=excluded.check_ins,content=excluded.content,reminders=excluded.reminders,workout_morning_reminder=excluded.workout_morning_reminder,workout_evening_reminder=excluded.workout_evening_reminder,workout_morning_reminder_time=excluded.workout_morning_reminder_time,workout_evening_reminder_time=excluded.workout_evening_reminder_time,meal_reminders=excluded.meal_reminders,meal_reminder_delay_minutes=excluded.meal_reminder_delay_minutes,end_of_day_reminder=excluded.end_of_day_reminder,end_of_day_reminder_time=excluded.end_of_day_reminder_time,updated_at=now();
end $$;
revoke all on function public.skip_scheduled_workout(uuid,text,date,text),public.snooze_scheduled_workout(uuid,date),public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,time,time,boolean,smallint,boolean,time) from public;
grant execute on function public.skip_scheduled_workout(uuid,text,date,text),public.snooze_scheduled_workout(uuid,date),public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,time,time,boolean,smallint,boolean,time) to authenticated;
notify pgrst,'reload schema'; commit;
