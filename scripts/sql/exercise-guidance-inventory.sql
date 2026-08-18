-- Every exercise the seven approved programmes actually use, with what the
-- catalogue already holds for it. The list drives the guidance content: an
-- exercise is only worth writing for if a programme puts a client in front of it.
with used as (
  select distinct e.exercise_id
    from public.workout_program_exercises e
    join public.workout_program_days d on d.id = e.day_id
    join public.workout_programs p on p.id = d.program_id
   where p.status = 'active' and p.official
)
select jsonb_agg(jsonb_build_object(
  'id', w.id,
  'name', w.name,
  'primary', w.primary_muscle_group,
  'secondary', w.secondary_muscle_groups,
  'equipment', w.equipment,
  'category', w.category,
  'difficulty', w.difficulty,
  'executionNotes', w.execution_notes,
  'howTo', w.how_to,
  'cues', w.cues,
  'mistakes', w.common_mistakes,
  'hasVideo', (w.video is not null)
) order by w.primary_muscle_group, w.name) as exercises
from public.workout_exercises w
join used u on u.exercise_id = w.id;
