-- Filling in a workout after the fact.
--
-- A client who trains without the phone in hand finishes with the sets marked and
-- the numbers empty, and there was no way back in: complete_workout only accepts a
-- session that is still active, and nothing else could write to workout_sets. The
-- numbers were simply lost.
--
-- update_completed_workout is complete_workout's body against a session that is
-- already completed. It rewrites the exercise results and the sets and may correct
-- the note, the difficulty, the energy and the sleep hours. It cannot move the
-- session to another day, programme or client, it does not change when the workout
-- happened, and it raises no second "workout completed" notification.

begin;

create or replace function public.update_completed_workout(p_workout jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_session_id text:=regexp_replace(nullif(p_workout->>'id',''),'^workout-',''); v_result jsonb; v_set jsonb;
begin
  if public.current_role()<>'client' or not exists(select 1 from public.workout_sessions where id=v_session_id and client_id=auth.uid() and status='completed') then raise exception 'completed_session_not_found'; end if;
  delete from public.workout_session_exercises where session_id=v_session_id;
  for v_result in select * from jsonb_array_elements(coalesce(p_workout->'exerciseResults','[]'::jsonb)) loop
    insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,skipped,completed,sort_order)
    values(v_session_id,v_result->>'workoutExerciseId',v_result->>'exerciseId',coalesce((v_result->>'skipped')::boolean,false),coalesce((v_result->>'completed')::boolean,false),coalesce((select e.sort_order from public.workout_program_exercises e where e.id=v_result->>'workoutExerciseId'),0));
    for v_set in select * from jsonb_array_elements(coalesce(v_result->'sets','[]'::jsonb)) loop
      insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,notes,completed,completed_at)
      values(v_session_id,v_result->>'workoutExerciseId',v_set->>'id',nullif(v_set->>'prescriptionId',''),coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'weightKg','')::numeric,nullif(v_set->>'repetitions','')::integer,nullif(v_set->>'notes',''),coalesce((v_set->>'completed')::boolean,false),nullif(v_set->>'completedAt','')::timestamptz);
    end loop;
  end loop;
  update public.workout_sessions set total_volume=coalesce((p_workout->>'totalVolume')::numeric,0),workout_note=nullif(p_workout->>'workoutNote',''),perceived_difficulty=nullif(p_workout->>'perceivedDifficulty','')::smallint,energy=nullif(p_workout->>'energy','')::smallint,sleep_hours=nullif(p_workout->>'sleepHours','')::numeric where id=v_session_id and client_id=auth.uid();
  return p_workout->>'id';
end $$;

revoke all on function public.update_completed_workout(jsonb) from public;
grant execute on function public.update_completed_workout(jsonb) to authenticated;

commit;
