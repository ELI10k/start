-- Everything a completed workout shows the client, as it stands right now. Diffed
-- against the pre-migration backup to prove that editing a programme moved none
-- of it.
select jsonb_build_object(
  'workout_sessions', (
    select jsonb_agg(to_jsonb(t) order by t.id) from (
      select id, completion_id, client_id, program_id, day_id, status, started_at, completed_at,
             duration_seconds, total_volume, workout_note, perceived_difficulty, energy
        from public.workout_sessions
    ) t
  ),
  'workout_session_exercises', (
    select jsonb_agg(to_jsonb(t) order by t.session_id, t.workout_exercise_id) from (
      select session_id, workout_exercise_id, exercise_id, skipped, completed, sort_order
        from public.workout_session_exercises
    ) t
  ),
  'workout_sets', (
    select jsonb_agg(to_jsonb(t) order by t.session_id, t.id) from (
      select session_id, workout_exercise_id, id, sort_order, weight_kg, repetitions, notes, completed, completed_at
        from public.workout_sets
    ) t
  )
) as history;
