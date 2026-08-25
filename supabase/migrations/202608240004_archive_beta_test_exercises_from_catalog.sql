begin;

-- Seed-only exercises are useful for the isolated beta client, but they are not
-- approved catalogue content and have no source video. Archiving keeps existing
-- historical/program references resolvable while removing them from the coach's
-- active exercise directory.
update public.workout_exercises
set status='archived', updated_at=now()
where id like 'beta-test-exercise-%'
  and source_workbooks @> array['Beta test']::text[];

commit;
