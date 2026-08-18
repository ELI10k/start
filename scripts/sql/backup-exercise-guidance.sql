-- The 37 catalogue rows the guidance migration touches, exactly as they stand.
-- Restoring is a matter of writing these four columns back; nothing else in the
-- row is in scope, so nothing else is captured.
select jsonb_build_object(
  'taken_at', now(),
  'count', (select count(*) from public.workout_exercises w
             where exists (select 1 from public.workout_program_exercises e
                             join public.workout_program_days d on d.id = e.day_id
                             join public.workout_programs p on p.id = d.program_id
                            where e.exercise_id = w.id and p.status = 'active' and p.official)),
  'rows', (
    select jsonb_agg(jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'how_to', w.how_to,
      'cues', w.cues,
      'common_mistakes', w.common_mistakes,
      'equipment', w.equipment
    ) order by w.id)
    from public.workout_exercises w
    where exists (select 1 from public.workout_program_exercises e
                    join public.workout_program_days d on d.id = e.day_id
                    join public.workout_programs p on p.id = d.program_id
                   where e.exercise_id = w.id and p.status = 'active' and p.official)
  )
) as backup;
