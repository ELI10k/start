begin;
alter table public.workout_session_exercises drop constraint if exists workout_session_exercises_difficulty_check;
alter table public.workout_session_exercises add constraint workout_session_exercises_difficulty_check check (difficulty is null or difficulty in ('easy','medium','hard'));
notify pgrst, 'reload schema';
commit;
