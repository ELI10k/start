begin;

insert into public.workout_exercises (
  id, name, normalized_name, aliases, category, primary_muscle_group,
  secondary_muscle_groups, video, source_workbooks, source_references, status
)
values (
  'exercise-155pu7s', 'חימום דינאמי לפי אימון', 'חימום דינאמי לפי אימון',
  '{}', 'משקל גוף', 'חימום', '{}',
  '{"url":"https://www.youtube.com/watch?v=ame_QBc8ozs","provider":"youtube"}'::jsonb,
  '{}', '[]'::jsonb, 'active'
)
on conflict (id) do update set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  primary_muscle_group = excluded.primary_muscle_group,
  video = excluded.video,
  status = 'active';

-- Move only days that do not already contain the dynamic warm-up. The temporary
-- offset avoids collisions with the unique (day_id, sort_order) constraint.
update public.workout_program_exercises
set sort_order = sort_order + 1000
where day_id in (
  select d.id from public.workout_program_days d
  where not exists (
    select 1 from public.workout_program_exercises e
    where e.day_id = d.id and e.exercise_id = 'exercise-155pu7s'
  )
);

update public.workout_program_exercises
set sort_order = sort_order - 999
where sort_order >= 1000
  and exists (
    select 1 from public.workout_program_days d
    where d.id = workout_program_exercises.day_id
      and not exists (
        select 1 from public.workout_program_exercises warmup
        where warmup.day_id = d.id and warmup.exercise_id = 'exercise-155pu7s'
      )
  );

insert into public.workout_program_exercises (
  id, day_id, exercise_id, sort_order, sets_text, reps_text, rest_text, notes
)
select
  'dynamic-warmup-' || md5(d.id), d.id, 'exercise-155pu7s', 0,
  null, null, null, 'צפו בסרטון וסמנו השלמה לאחר ביצוע החימום.'
from public.workout_program_days d
where not exists (
  select 1 from public.workout_program_exercises e
  where e.day_id = d.id and e.exercise_id = 'exercise-155pu7s'
);

commit;
