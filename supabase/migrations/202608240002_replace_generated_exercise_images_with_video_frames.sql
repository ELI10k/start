begin;

update public.workout_exercises
set video='{"provider":"youtube","url":"https://www.youtube.com/watch?v=k8ipHzKeAkQ","title":"Exercises with an Athletic Trainer: Standing Calf Raises"}'::jsonb,
    image_url='https://i.ytimg.com/vi/k8ipHzKeAkQ/hqdefault.jpg',
    updated_at=now()
where id='beta-test-exercise-10';

update public.workout_exercises
set video='{"provider":"youtube","url":"https://www.youtube.com/watch?v=s6coxb732BA","title":"How To Do A Forearm Plank"}'::jsonb,
    image_url='https://i.ytimg.com/vi/s6coxb732BA/hqdefault.jpg',
    updated_at=now()
where id='beta-test-exercise-11';

update public.workout_exercises
set video='{"provider":"youtube","url":"https://www.youtube.com/watch?v=SqO-VUEak2M","title":"How To Do Cable Kickbacks"}'::jsonb,
    image_url='https://i.ytimg.com/vi/SqO-VUEak2M/hqdefault.jpg',
    updated_at=now()
where id='exercise-19zx08z';

commit;
