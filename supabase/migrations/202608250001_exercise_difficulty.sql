begin;
alter table public.workout_session_exercises add column if not exists difficulty text;
alter table public.workout_session_exercises drop constraint if exists workout_session_exercises_difficulty_check;
alter table public.workout_session_exercises add constraint workout_session_exercises_difficulty_check check (difficulty is null or difficulty in ('easy','hard'));

create or replace function public.save_active_workout(p_session jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_id text:=nullif(p_session->>'id',''); v_assignment uuid:=nullif(p_session->>'assignmentId','')::uuid; v_result jsonb; v_set jsonb;
begin
  if public.current_role()<>'client' or v_id is null then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.workout_assignments a join public.workout_program_days d on d.program_id=a.program_id where a.id=v_assignment and a.client_id=auth.uid() and a.status='active' and a.program_id=p_session->>'programId' and d.id=p_session->>'dayId') then raise exception 'assignment_not_active'; end if;
  insert into public.workout_sessions(id,client_id,assignment_id,program_id,day_id,status,started_at,current_exercise_index,rest_ends_at,workout_note,perceived_difficulty,energy,sleep_hours) values(v_id,auth.uid(),v_assignment,p_session->>'programId',p_session->>'dayId','active',(p_session->>'startedAt')::timestamptz,coalesce((p_session->>'currentExerciseIndex')::integer,0),nullif(p_session->>'restEndsAt','')::timestamptz,nullif(p_session->>'workoutNote',''),nullif(p_session->>'perceivedDifficulty','')::smallint,nullif(p_session->>'energy','')::smallint,nullif(p_session->>'sleepHours','')::numeric) on conflict(id) do update set current_exercise_index=excluded.current_exercise_index,rest_ends_at=excluded.rest_ends_at,workout_note=excluded.workout_note,perceived_difficulty=excluded.perceived_difficulty,energy=excluded.energy,sleep_hours=excluded.sleep_hours where public.workout_sessions.client_id=auth.uid() and public.workout_sessions.status='active';
  if not found then raise exception 'session_not_owned'; end if;
  delete from public.workout_session_exercises where session_id=v_id;
  for v_result in select * from jsonb_array_elements(coalesce(p_session->'exerciseResults','[]'::jsonb)) loop
    insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,performed_exercise_id,skipped,completed,sort_order,difficulty) values(v_id,v_result->>'workoutExerciseId',v_result->>'exerciseId',nullif(v_result->>'performedExerciseId',''),coalesce((v_result->>'skipped')::boolean,false),coalesce((v_result->>'completed')::boolean,false),coalesce((select e.sort_order from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId'),0),nullif(v_result->>'difficulty',''));
    for v_set in select * from jsonb_array_elements(coalesce(v_result->'sets','[]'::jsonb)) loop insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,notes,completed,completed_at) values(v_id,v_result->>'workoutExerciseId',v_set->>'id',nullif(v_set->>'prescriptionId',''),coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'weightKg','')::numeric,nullif(v_set->>'repetitions','')::integer,nullif(v_set->>'notes',''),coalesce((v_set->>'completed')::boolean,false),nullif(v_set->>'completedAt','')::timestamptz); end loop;
  end loop; return v_id;
end $$;

create or replace function public.complete_workout(p_workout jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_session_id text:=regexp_replace(nullif(p_workout->>'id',''),'^workout-',''); v_result jsonb; v_set jsonb;
begin
  if public.current_role()<>'client' or not exists(select 1 from public.workout_sessions where id=v_session_id and client_id=auth.uid() and status='active') then raise exception 'active_session_not_found'; end if;
  delete from public.workout_session_exercises where session_id=v_session_id;
  for v_result in select * from jsonb_array_elements(coalesce(p_workout->'exerciseResults','[]'::jsonb)) loop
    insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,performed_exercise_id,skipped,completed,sort_order,difficulty) values(v_session_id,v_result->>'workoutExerciseId',v_result->>'exerciseId',nullif(v_result->>'performedExerciseId',''),coalesce((v_result->>'skipped')::boolean,false),coalesce((v_result->>'completed')::boolean,false),coalesce((select e.sort_order from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId'),0),nullif(v_result->>'difficulty',''));
    for v_set in select * from jsonb_array_elements(coalesce(v_result->'sets','[]'::jsonb)) loop insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,notes,completed,completed_at) values(v_session_id,v_result->>'workoutExerciseId',v_set->>'id',nullif(v_set->>'prescriptionId',''),coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'weightKg','')::numeric,nullif(v_set->>'repetitions','')::integer,nullif(v_set->>'notes',''),coalesce((v_set->>'completed')::boolean,false),nullif(v_set->>'completedAt','')::timestamptz); end loop;
  end loop;
  update public.workout_sessions set status='completed',completion_id=p_workout->>'id',completed_at=(p_workout->>'completedAt')::timestamptz,duration_seconds=(p_workout->>'durationSeconds')::integer,total_volume=coalesce((p_workout->>'totalVolume')::numeric,0),workout_note=nullif(p_workout->>'workoutNote',''),perceived_difficulty=nullif(p_workout->>'perceivedDifficulty','')::smallint,energy=nullif(p_workout->>'energy','')::smallint,sleep_hours=nullif(p_workout->>'sleepHours','')::numeric,rest_ends_at=null where id=v_session_id and client_id=auth.uid();
  insert into public.workout_notifications(id,client_id,type,created_at) values('notification-'||(p_workout->>'id'),auth.uid(),'completed-workout',(p_workout->>'completedAt')::timestamptz) on conflict(id) do nothing; return p_workout->>'id';
end $$;
notify pgrst, 'reload schema';
commit;
