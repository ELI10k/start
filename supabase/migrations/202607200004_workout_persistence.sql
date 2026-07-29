begin;

create type public.workout_program_status as enum ('active', 'archived');
create type public.workout_assignment_status as enum ('active', 'paused', 'completed', 'archived');
create type public.workout_session_status as enum ('active', 'completed', 'cancelled');
create type public.workout_notification_type as enum ('assignment', 'completed-workout', 'missed-workout');

create table public.workout_exercises (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  normalized_name text not null,
  aliases text[] not null default '{}',
  category text,
  primary_muscle_group text,
  secondary_muscle_groups text[] not null default '{}',
  equipment text,
  difficulty text,
  video jsonb,
  execution_notes text,
  source_workbooks text[] not null default '{}',
  source_references jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_exercises_search_idx on public.workout_exercises using gin (normalized_name gin_trgm_ops);

create table public.workout_programs (
  id text primary key,
  coach_id uuid references public.profiles(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  description text,
  program_type text,
  difficulty text,
  training_frequency smallint check (training_frequency is null or training_frequency between 1 and 7),
  equipment text[] not null default '{}',
  source_workbook text not null default '',
  source_sheet text,
  status public.workout_program_status not null default 'active',
  official boolean not null default false,
  duplicated_from_id text references public.workout_programs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official or coach_id is not null)
);
create index workout_programs_coach_status_idx on public.workout_programs(coach_id, status);

create table public.workout_program_days (
  id text primary key,
  program_id text not null references public.workout_programs(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order smallint not null default 0,
  source_sheet text,
  unique(program_id, sort_order)
);

create table public.workout_program_exercises (
  id text primary key,
  day_id text not null references public.workout_program_days(id) on delete cascade,
  exercise_id text not null references public.workout_exercises(id) on delete restrict,
  sort_order smallint not null default 0,
  sets_text text,
  reps_text text,
  rest_text text,
  notes text,
  source_row integer,
  unique(day_id, sort_order)
);
create index workout_program_exercises_exercise_idx on public.workout_program_exercises(exercise_id);

create table public.workout_set_prescriptions (
  id text primary key,
  program_exercise_id text not null references public.workout_program_exercises(id) on delete cascade,
  sort_order smallint not null default 0,
  repetitions text,
  unique(program_exercise_id, sort_order)
);

create table public.workout_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null references public.workout_programs(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  start_date date not null,
  end_date date,
  weekly_frequency smallint not null check (weekly_frequency between 1 and 7),
  coach_note text,
  status public.workout_assignment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index workout_assignments_one_active_per_client on public.workout_assignments(client_id) where status = 'active';
create index workout_assignments_program_idx on public.workout_assignments(program_id, assigned_at desc);

create table public.workout_sessions (
  id text primary key,
  completion_id text unique,
  client_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.workout_assignments(id) on delete restrict,
  program_id text not null references public.workout_programs(id) on delete restrict,
  day_id text not null references public.workout_program_days(id) on delete restrict,
  status public.workout_session_status not null default 'active',
  started_at timestamptz not null,
  completed_at timestamptz,
  current_exercise_index integer not null default 0 check (current_exercise_index >= 0),
  rest_ends_at timestamptz,
  workout_note text,
  perceived_difficulty smallint check (perceived_difficulty between 1 and 5),
  energy smallint check (energy between 1 and 5),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  total_volume numeric(14,2) not null default 0 check (total_volume >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null and completion_id is not null) or status <> 'completed')
);
create unique index workout_sessions_one_active_per_client on public.workout_sessions(client_id) where status = 'active';
create index workout_sessions_client_history_idx on public.workout_sessions(client_id, completed_at desc) where status = 'completed';

create table public.workout_session_exercises (
  session_id text not null references public.workout_sessions(id) on delete cascade,
  workout_exercise_id text not null references public.workout_program_exercises(id) on delete restrict,
  exercise_id text not null references public.workout_exercises(id) on delete restrict,
  skipped boolean not null default false,
  completed boolean not null default false,
  sort_order smallint not null default 0,
  primary key(session_id, workout_exercise_id)
);

create table public.workout_sets (
  session_id text not null,
  workout_exercise_id text not null,
  id text not null,
  prescription_id text references public.workout_set_prescriptions(id) on delete set null,
  sort_order smallint not null default 0,
  weight_kg numeric(8,2) check (weight_kg is null or weight_kg >= 0),
  repetitions integer check (repetitions is null or repetitions >= 0),
  notes text,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key(session_id, id),
  foreign key(session_id, workout_exercise_id) references public.workout_session_exercises(session_id, workout_exercise_id) on delete cascade
);
create index workout_sets_exercise_history_idx on public.workout_sets(workout_exercise_id, completed_at desc);

create table public.workout_coach_notes (
  id text primary key,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id text references public.workout_exercises(id) on delete set null,
  session_id text references public.workout_sessions(id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.workout_preferences (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  training_types text[] not null default '{}',
  equipment text[] not null default '{}',
  training_location text,
  preferred_days smallint[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (preferred_days <@ array[0,1,2,3,4,5,6]::smallint[])
);

create table public.workout_notifications (
  id text primary key,
  client_id uuid not null references public.profiles(id) on delete cascade,
  type public.workout_notification_type not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create trigger workout_exercises_touch before update on public.workout_exercises for each row execute function public.touch_updated_at();
create trigger workout_programs_touch before update on public.workout_programs for each row execute function public.touch_updated_at();
create trigger workout_assignments_touch before update on public.workout_assignments for each row execute function public.touch_updated_at();
create trigger workout_sessions_touch before update on public.workout_sessions for each row execute function public.touch_updated_at();
create trigger workout_preferences_touch before update on public.workout_preferences for each row execute function public.touch_updated_at();

alter table public.workout_exercises enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workout_program_days enable row level security;
alter table public.workout_program_exercises enable row level security;
alter table public.workout_set_prescriptions enable row level security;
alter table public.workout_assignments enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_coach_notes enable row level security;
alter table public.workout_preferences enable row level security;
alter table public.workout_notifications enable row level security;

create policy workout_exercises_authenticated_read on public.workout_exercises for select to authenticated using (true);
create policy workout_programs_authenticated_read on public.workout_programs for select to authenticated using (true);
create policy workout_programs_coach_insert on public.workout_programs for insert to authenticated with check (not official and coach_id = (select auth.uid()) and public.current_role() = 'coach');
create policy workout_programs_coach_update on public.workout_programs for update to authenticated using (not official and coach_id = (select auth.uid())) with check (not official and coach_id = (select auth.uid()));
create policy workout_days_authenticated_read on public.workout_program_days for select to authenticated using (true);
create policy workout_days_coach_write on public.workout_program_days for all to authenticated using (exists(select 1 from public.workout_programs p where p.id=program_id and not p.official and p.coach_id=(select auth.uid()))) with check (exists(select 1 from public.workout_programs p where p.id=program_id and not p.official and p.coach_id=(select auth.uid())));
create policy workout_program_exercises_authenticated_read on public.workout_program_exercises for select to authenticated using (true);
create policy workout_program_exercises_coach_write on public.workout_program_exercises for all to authenticated using (exists(select 1 from public.workout_program_days d join public.workout_programs p on p.id=d.program_id where d.id=day_id and not p.official and p.coach_id=(select auth.uid()))) with check (exists(select 1 from public.workout_program_days d join public.workout_programs p on p.id=d.program_id where d.id=day_id and not p.official and p.coach_id=(select auth.uid())));
create policy workout_prescriptions_authenticated_read on public.workout_set_prescriptions for select to authenticated using (true);
create policy workout_prescriptions_coach_write on public.workout_set_prescriptions for all to authenticated using (exists(select 1 from public.workout_program_exercises e join public.workout_program_days d on d.id=e.day_id join public.workout_programs p on p.id=d.program_id where e.id=program_exercise_id and not p.official and p.coach_id=(select auth.uid()))) with check (exists(select 1 from public.workout_program_exercises e join public.workout_program_days d on d.id=e.day_id join public.workout_programs p on p.id=d.program_id where e.id=program_exercise_id and not p.official and p.coach_id=(select auth.uid())));
create policy workout_assignments_participant_read on public.workout_assignments for select to authenticated using (client_id=(select auth.uid()) or public.is_coach_for(client_id));
create policy workout_sessions_participant_read on public.workout_sessions for select to authenticated using (client_id=(select auth.uid()) or public.is_coach_for(client_id));
create policy workout_session_exercises_participant_read on public.workout_session_exercises for select to authenticated using (exists(select 1 from public.workout_sessions s where s.id=session_id and (s.client_id=(select auth.uid()) or public.is_coach_for(s.client_id))));
create policy workout_sets_participant_read on public.workout_sets for select to authenticated using (exists(select 1 from public.workout_sessions s where s.id=session_id and (s.client_id=(select auth.uid()) or public.is_coach_for(s.client_id))));
create policy workout_notes_participant_read on public.workout_coach_notes for select to authenticated using (client_id=(select auth.uid()) or public.is_coach_for(client_id));
create policy workout_preferences_participant_read on public.workout_preferences for select to authenticated using (client_id=(select auth.uid()) or public.is_coach_for(client_id));
create policy workout_preferences_client_write on public.workout_preferences for all to authenticated using (client_id=(select auth.uid())) with check (client_id=(select auth.uid()));
create policy workout_notifications_client_read on public.workout_notifications for select to authenticated using (client_id=(select auth.uid()));

revoke all on table public.workout_exercises, public.workout_programs, public.workout_program_days, public.workout_program_exercises, public.workout_set_prescriptions, public.workout_assignments, public.workout_sessions, public.workout_session_exercises, public.workout_sets, public.workout_coach_notes, public.workout_preferences, public.workout_notifications from anon, authenticated;
grant select on table public.workout_exercises, public.workout_programs, public.workout_program_days, public.workout_program_exercises, public.workout_set_prescriptions, public.workout_assignments, public.workout_sessions, public.workout_session_exercises, public.workout_sets, public.workout_coach_notes, public.workout_preferences, public.workout_notifications to authenticated;
grant insert, update on table public.workout_programs, public.workout_program_days, public.workout_program_exercises, public.workout_set_prescriptions, public.workout_preferences to authenticated;
grant delete on table public.workout_program_days, public.workout_program_exercises, public.workout_set_prescriptions to authenticated;

create or replace function public.assign_workout_program(p_program_id text, p_client_id uuid, p_start_date date, p_end_date date, p_weekly_frequency smallint, p_coach_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'coach' or not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
  if p_weekly_frequency not between 1 and 7 or (p_end_date is not null and p_end_date < p_start_date) then raise exception 'invalid_assignment'; end if;
  if not exists(select 1 from public.workout_programs where id=p_program_id and status='active') then raise exception 'program_not_available'; end if;
  update public.workout_assignments set status='completed' where client_id=p_client_id and status='active';
  insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,end_date,weekly_frequency,coach_note)
  values(p_client_id,p_program_id,auth.uid(),p_start_date,p_end_date,p_weekly_frequency,nullif(trim(p_coach_note),'')) returning id into v_id;
  insert into public.workout_notifications(id,client_id,type) values('notification-'||v_id::text,p_client_id,'assignment');
  return v_id;
end $$;

create or replace function public.set_workout_assignment_status(p_assignment_id uuid, p_status public.workout_assignment_status)
returns void language plpgsql security definer set search_path=public as $$
declare v_client_id uuid;
begin
  select client_id into v_client_id from public.workout_assignments where id=p_assignment_id;
  if v_client_id is null or public.current_role()<>'coach' or not public.is_coach_for(v_client_id) then raise exception 'not_authorized'; end if;
  if p_status='active' then update public.workout_assignments set status='completed' where client_id=v_client_id and status='active' and id<>p_assignment_id; end if;
  update public.workout_assignments set status=p_status where id=p_assignment_id;
  if p_status<>'active' then update public.workout_sessions set status='cancelled' where assignment_id=p_assignment_id and status='active'; end if;
end $$;

create or replace function public.save_workout_program_tree(p_program jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_id text:=nullif(p_program->>'id',''); v_day jsonb; v_entry jsonb; v_set jsonb;
begin
  if public.current_role()<>'coach' or v_id is null or coalesce((p_program->>'official')::boolean,false) then raise exception 'not_authorized'; end if;
  insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,source_sheet,status,official,duplicated_from_id)
  values(v_id,auth.uid(),trim(p_program->>'name'),nullif(p_program->>'description',''),nullif(p_program->>'programType',''),nullif(p_program->>'difficulty',''),nullif(p_program->>'trainingFrequency','')::smallint,
    array(select jsonb_array_elements_text(coalesce(p_program->'equipment','[]'::jsonb))),coalesce(p_program->>'sourceWorkbook',''),nullif(p_program->>'sourceSheet',''),coalesce(nullif(p_program->>'status','')::public.workout_program_status,'active'),false,nullif(p_program->>'duplicatedFromId',''))
  on conflict(id) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,difficulty=excluded.difficulty,training_frequency=excluded.training_frequency,equipment=excluded.equipment,source_workbook=excluded.source_workbook,source_sheet=excluded.source_sheet,status=excluded.status
  where not public.workout_programs.official and public.workout_programs.coach_id=auth.uid();
  if not found then raise exception 'program_not_owned'; end if;
  delete from public.workout_program_days where program_id=v_id;
  for v_day in select * from jsonb_array_elements(coalesce(p_program->'days','[]'::jsonb)) loop
    insert into public.workout_program_days(id,program_id,name,sort_order,source_sheet) values(v_day->>'id',v_id,trim(v_day->>'name'),coalesce((v_day->>'order')::smallint,0),nullif(v_day->>'sourceSheet',''));
    for v_entry in select * from jsonb_array_elements(coalesce(v_day->'exercises','[]'::jsonb)) loop
      insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,source_row)
      values(v_entry->>'id',v_day->>'id',v_entry->>'exerciseId',coalesce((v_entry->>'order')::smallint,0),nullif(v_entry->>'sets',''),nullif(v_entry->>'reps',''),nullif(v_entry->>'rest',''),nullif(v_entry->>'notes',''),nullif(v_entry->>'sourceRow','')::integer);
      for v_set in select * from jsonb_array_elements(coalesce(v_entry->'setPrescriptions','[]'::jsonb)) loop
        insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions) values(v_set->>'id',v_entry->>'id',coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'repetitions',''));
      end loop;
    end loop;
  end loop;
  return v_id;
end $$;

create or replace function public.save_active_workout(p_session jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_id text:=nullif(p_session->>'id',''); v_assignment uuid:=nullif(p_session->>'assignmentId','')::uuid; v_result jsonb; v_set jsonb;
begin
  if public.current_role()<>'client' or v_id is null then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.workout_assignments a join public.workout_program_days d on d.program_id=a.program_id where a.id=v_assignment and a.client_id=auth.uid() and a.status='active' and a.program_id=p_session->>'programId' and d.id=p_session->>'dayId') then raise exception 'assignment_not_active'; end if;
  insert into public.workout_sessions(id,client_id,assignment_id,program_id,day_id,status,started_at,current_exercise_index,rest_ends_at,workout_note,perceived_difficulty,energy)
  values(v_id,auth.uid(),v_assignment,p_session->>'programId',p_session->>'dayId','active',(p_session->>'startedAt')::timestamptz,coalesce((p_session->>'currentExerciseIndex')::integer,0),nullif(p_session->>'restEndsAt','')::timestamptz,nullif(p_session->>'workoutNote',''),nullif(p_session->>'perceivedDifficulty','')::smallint,nullif(p_session->>'energy','')::smallint)
  on conflict(id) do update set current_exercise_index=excluded.current_exercise_index,rest_ends_at=excluded.rest_ends_at,workout_note=excluded.workout_note,perceived_difficulty=excluded.perceived_difficulty,energy=excluded.energy
  where public.workout_sessions.client_id=auth.uid() and public.workout_sessions.status='active';
  if not found then raise exception 'session_not_owned'; end if;
  delete from public.workout_session_exercises where session_id=v_id;
  for v_result in select * from jsonb_array_elements(coalesce(p_session->'exerciseResults','[]'::jsonb)) loop
    if not exists(select 1 from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId' and e.day_id=p_session->>'dayId' and e.exercise_id=v_result->>'exerciseId') then raise exception 'invalid_workout_exercise'; end if;
    insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,skipped,completed,sort_order)
    values(v_id,v_result->>'workoutExerciseId',v_result->>'exerciseId',coalesce((v_result->>'skipped')::boolean,false),coalesce((v_result->>'completed')::boolean,false),coalesce((select e.sort_order from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId'),0));
    for v_set in select * from jsonb_array_elements(coalesce(v_result->'sets','[]'::jsonb)) loop
      insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,notes,completed,completed_at)
      values(v_id,v_result->>'workoutExerciseId',v_set->>'id',nullif(v_set->>'prescriptionId',''),coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'weightKg','')::numeric,nullif(v_set->>'repetitions','')::integer,nullif(v_set->>'notes',''),coalesce((v_set->>'completed')::boolean,false),nullif(v_set->>'completedAt','')::timestamptz);
    end loop;
  end loop;
  return v_id;
end $$;

create or replace function public.complete_workout(p_workout jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_session_id text:=regexp_replace(nullif(p_workout->>'id',''),'^workout-',''); v_result jsonb; v_set jsonb;
begin
  if public.current_role()<>'client' or not exists(select 1 from public.workout_sessions where id=v_session_id and client_id=auth.uid() and status='active') then raise exception 'active_session_not_found'; end if;
  delete from public.workout_session_exercises where session_id=v_session_id;
  for v_result in select * from jsonb_array_elements(coalesce(p_workout->'exerciseResults','[]'::jsonb)) loop
    insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,skipped,completed,sort_order)
    values(v_session_id,v_result->>'workoutExerciseId',v_result->>'exerciseId',coalesce((v_result->>'skipped')::boolean,false),coalesce((v_result->>'completed')::boolean,false),coalesce((select e.sort_order from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId'),0));
    for v_set in select * from jsonb_array_elements(coalesce(v_result->'sets','[]'::jsonb)) loop
      insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,notes,completed,completed_at)
      values(v_session_id,v_result->>'workoutExerciseId',v_set->>'id',nullif(v_set->>'prescriptionId',''),coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'weightKg','')::numeric,nullif(v_set->>'repetitions','')::integer,nullif(v_set->>'notes',''),coalesce((v_set->>'completed')::boolean,false),nullif(v_set->>'completedAt','')::timestamptz);
    end loop;
  end loop;
  update public.workout_sessions set status='completed',completion_id=p_workout->>'id',completed_at=(p_workout->>'completedAt')::timestamptz,duration_seconds=(p_workout->>'durationSeconds')::integer,total_volume=coalesce((p_workout->>'totalVolume')::numeric,0),workout_note=nullif(p_workout->>'workoutNote',''),perceived_difficulty=nullif(p_workout->>'perceivedDifficulty','')::smallint,energy=nullif(p_workout->>'energy','')::smallint,rest_ends_at=null where id=v_session_id and client_id=auth.uid();
  insert into public.workout_notifications(id,client_id,type,created_at) values('notification-'||(p_workout->>'id'),auth.uid(),'completed-workout',(p_workout->>'completedAt')::timestamptz) on conflict(id) do nothing;
  return p_workout->>'id';
end $$;

create or replace function public.cancel_active_workout()
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_role()<>'client' then raise exception 'not_authorized'; end if;
  update public.workout_sessions set status='cancelled',rest_ends_at=null where client_id=auth.uid() and status='active';
end $$;

create or replace function public.save_workout_coach_note(p_id text,p_client_id uuid,p_exercise_id text,p_session_id text,p_body text)
returns text language plpgsql security definer set search_path=public as $$
begin
  if public.current_role()<>'coach' or not public.is_coach_for(p_client_id) or length(trim(p_body))=0 then raise exception 'not_authorized'; end if;
  insert into public.workout_coach_notes(id,coach_id,client_id,exercise_id,session_id,body) values(p_id,auth.uid(),p_client_id,nullif(p_exercise_id,''),nullif(p_session_id,''),trim(p_body));
  return p_id;
end $$;

revoke all on function public.assign_workout_program(text,uuid,date,date,smallint,text), public.set_workout_assignment_status(uuid,public.workout_assignment_status), public.save_workout_program_tree(jsonb), public.save_active_workout(jsonb), public.complete_workout(jsonb), public.cancel_active_workout(), public.save_workout_coach_note(text,uuid,text,text,text) from public;
grant execute on function public.assign_workout_program(text,uuid,date,date,smallint,text), public.set_workout_assignment_status(uuid,public.workout_assignment_status), public.save_workout_program_tree(jsonb), public.save_active_workout(jsonb), public.complete_workout(jsonb), public.cancel_active_workout(), public.save_workout_coach_note(text,uuid,text,text,text) to authenticated;

commit;
