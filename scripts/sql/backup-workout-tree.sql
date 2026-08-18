-- A restore point for 202608110008, taken as postgres so it is the whole table
-- and not an RLS-filtered view of it. Covers every table the migration writes to
-- or adds a column to, plus the exact text of the function it replaces - so a
-- rollback can put the old save_workout_program_tree back verbatim rather than
-- from memory.
select jsonb_build_object(
  'taken_at', now(),
  'counts', jsonb_build_object(
    'workout_programs', (select count(*) from public.workout_programs),
    'workout_program_days', (select count(*) from public.workout_program_days),
    'workout_program_exercises', (select count(*) from public.workout_program_exercises),
    'workout_set_prescriptions', (select count(*) from public.workout_set_prescriptions),
    'workout_sessions', (select count(*) from public.workout_sessions),
    'workout_session_exercises', (select count(*) from public.workout_session_exercises),
    'workout_sets', (select count(*) from public.workout_sets)
  ),
  'save_workout_program_tree', (
    select pg_get_functiondef(p.oid) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout_program_tree'
  ),
  'unique_constraints', (
    select jsonb_agg(jsonb_build_object('tbl', c.conrelid::regclass::text, 'name', c.conname, 'def', pg_get_constraintdef(c.oid)))
      from pg_constraint c
     where c.contype = 'u'
       and c.conrelid in ('public.workout_program_days'::regclass,'public.workout_program_exercises'::regclass,'public.workout_set_prescriptions'::regclass)
  ),
  'workout_programs', (select jsonb_agg(to_jsonb(t)) from public.workout_programs t),
  'workout_program_days', (select jsonb_agg(to_jsonb(t)) from public.workout_program_days t),
  'workout_program_exercises', (select jsonb_agg(to_jsonb(t)) from public.workout_program_exercises t),
  'workout_set_prescriptions', (select jsonb_agg(to_jsonb(t)) from public.workout_set_prescriptions t),
  'workout_sessions', (select jsonb_agg(to_jsonb(t)) from public.workout_sessions t),
  'workout_session_exercises', (select jsonb_agg(to_jsonb(t)) from public.workout_session_exercises t),
  'workout_sets', (select jsonb_agg(to_jsonb(t)) from public.workout_sets t)
) as backup;
