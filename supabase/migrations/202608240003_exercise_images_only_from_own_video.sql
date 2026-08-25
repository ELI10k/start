begin;

-- These videos were added only to source a thumbnail. Restore the original
-- catalogue state: a missing exercise video must not be replaced by a video
-- selected from outside that exercise record.
update public.workout_exercises
set video=null, image_url=null, updated_at=now()
where id in ('beta-test-exercise-10','beta-test-exercise-11','exercise-19zx08z');

-- A thumbnail belongs to an exercise only when it is derived from that exact
-- exercise row's own approved YouTube video. Rows without their own video keep
-- no image rather than borrowing another movement's frame.
with own_video as (
  select id,
    case
      when video->>'url' ~ 'youtu\.be/' then substring(video->>'url' from 'youtu\.be/([^?&/]+)')
      when video->>'url' ~ '/shorts/' then substring(video->>'url' from '/shorts/([^?&/]+)')
      else substring(video->>'url' from '[?&]v=([^&]+)')
    end as video_id
  from public.workout_exercises
)
update public.workout_exercises exercise
set image_url=case
      when coalesce(own_video.video_id,'')<>'' then 'https://i.ytimg.com/vi/'||own_video.video_id||'/hqdefault.jpg'
      else null
    end,
    updated_at=now()
from own_video
where exercise.id=own_video.id;

commit;
