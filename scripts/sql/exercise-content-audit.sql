-- What the "דגשים לתרגיל" sheet can actually show, for every exercise the seven
-- programmes use.
--
-- "Full" means the sheet renders every section with real content: how it is
-- performed, coaching cues, common mistakes, the muscles worked and the
-- equipment. execution_notes counts as how-to - it is verbatim coach text from
-- the source workbooks, which is why the panel already treats it that way.
with used as (
  select distinct e.exercise_id
    from public.workout_program_exercises e
    join public.workout_program_days d on d.id = e.day_id
    join public.workout_programs p on p.id = d.program_id
   where p.status = 'active'
),
scored as (
  select x.id, x.name,
         (coalesce(nullif(btrim(x.how_to), ''), nullif(btrim(x.execution_notes), '')) is not null) as has_how_to,
         (coalesce(array_length(x.cues, 1), 0) > 0) as has_cues,
         (coalesce(array_length(x.common_mistakes, 1), 0) > 0) as has_mistakes,
         (nullif(btrim(x.primary_muscle_group), '') is not null) as has_muscles,
         (nullif(btrim(x.equipment), '') is not null) as has_equipment,
         (nullif(btrim(x.image_url), '') is not null) as has_image,
         (x.video is not null) as has_video
    from public.workout_exercises x
    join used u on u.exercise_id = x.id
),
tallied as (
  select *,
         (has_how_to::int + has_cues::int + has_mistakes::int + has_muscles::int + has_equipment::int) as filled
    from scored
)
select jsonb_build_object(
  'programmes', (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'official', p.official) order by p.name)
                   from public.workout_programs p where p.status = 'active'),
  'totalExercisesUsed', (select count(*) from tallied),
  'full',    (select count(*) from tallied where filled = 5),
  'partial', (select count(*) from tallied where filled between 1 and 4),
  'none',    (select count(*) from tallied where filled = 0),
  'bySection', jsonb_build_object(
    'howTo',     (select count(*) from tallied where has_how_to),
    'cues',      (select count(*) from tallied where has_cues),
    'mistakes',  (select count(*) from tallied where has_mistakes),
    'muscles',   (select count(*) from tallied where has_muscles),
    'equipment', (select count(*) from tallied where has_equipment),
    'image',     (select count(*) from tallied where has_image),
    'video',     (select count(*) from tallied where has_video)
  ),
  'exercises', (select jsonb_agg(jsonb_build_object(
                  'id', t.id, 'name', t.name, 'filled', t.filled,
                  'howTo', t.has_how_to, 'cues', t.has_cues, 'mistakes', t.has_mistakes,
                  'muscles', t.has_muscles, 'equipment', t.has_equipment,
                  'image', t.has_image, 'video', t.has_video
                ) order by t.filled, t.name) from tallied t)
) as audit;
