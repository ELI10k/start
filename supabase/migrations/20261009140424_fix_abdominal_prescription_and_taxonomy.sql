begin;

-- This is an abdominal-flexion exercise, not the broader core/stability group.
-- Existing workout results reference the exercise id and remain untouched.
update public.workout_exercises
set primary_muscle_group = 'בטן', updated_at = now()
where id = 'exercise-pn4ire';

-- Repair only the affected live programme slot. Completed workout sets keep the
-- values the client actually performed; this changes future prescriptions only.
update public.workout_program_exercises e
set reps_text = '12'
from public.workout_program_days d
where e.id = 'workout-exercise-6583d2ff-bdf9-4351-866e-f984c4ba5aed'
  and e.day_id = d.id
  and d.program_id = 'coach-program-a375ccf6-bc59-4509-a642-64370378a569'
  and e.exercise_id = 'exercise-pn4ire'
  and e.retired_at is null;

update public.workout_set_prescriptions p
set repetitions = '12'
where p.program_exercise_id = 'workout-exercise-6583d2ff-bdf9-4351-866e-f984c4ba5aed';

commit;
