begin;

-- Approved YouTube videos are the most faithful source for an exercise still.
with video_ids as (
  select id,
    case
      when video->>'url' ~ 'youtu\.be/' then substring(video->>'url' from 'youtu\.be/([^?&/]+)')
      when video->>'url' ~ '/shorts/' then substring(video->>'url' from '/shorts/([^?&/]+)')
      else substring(video->>'url' from '[?&]v=([^&]+)')
    end as video_id
  from public.workout_exercises
  where coalesce(trim(image_url),'')='' and video is not null
)
update public.workout_exercises e
set image_url='https://i.ytimg.com/vi/'||v.video_id||'/hqdefault.jpg', updated_at=now()
from video_ids v
where e.id=v.id and coalesce(v.video_id,'')<>'';

-- Exercises with no approved video and no exact catalogue twin use dedicated
-- project assets generated for this purpose.
update public.workout_exercises set image_url='https://start.elicohenfitness.co.il/exercises/generated/cable-glute-kickback.jpg',updated_at=now() where id='exercise-19zx08z';
update public.workout_exercises set image_url='https://start.elicohenfitness.co.il/exercises/generated/calf-raise.jpg',updated_at=now() where id='beta-test-exercise-10';
update public.workout_exercises set image_url='https://start.elicohenfitness.co.il/exercises/generated/forearm-plank.jpg',updated_at=now() where id='beta-test-exercise-11';

-- Duplicate/import-test labels point to the same movement image as their
-- approved catalogue equivalent. Programme slots reference the exercise row,
-- so this reaches every existing programme without rewriting programme data.
with mappings(target_id,source_id) as (values
 ('beta-test-exercise-07','exercise-h4hp4e'),
 ('beta-test-exercise-15','exercise-mx59uy'),
 ('beta-test-exercise-02','exercise-1u5j1lv'),
 ('exercise-126wehi','exercise-1u5j1lv'),
 ('exercise-1h0qzj6','exercise-lp8zrd'),
 ('beta-test-exercise-09','exercise-1lrrpsj'),
 ('beta-test-exercise-05','exercise-f2juxe'),
 ('beta-test-exercise-14','exercise-2ez0zf'),
 ('beta-test-exercise-01','exercise-ptjiss'),
 ('beta-test-exercise-03','exercise-14tz34b'),
 ('beta-test-exercise-08','exercise-mhdxgx'),
 ('beta-test-exercise-06','exercise-1oguz0o'),
 ('beta-test-exercise-12','exercise-1ly3xqh'),
 ('beta-test-exercise-04','exercise-yspcn'),
 ('beta-test-exercise-13','exercise-150pt7l')
)
update public.workout_exercises target
set image_url=source.image_url,updated_at=now()
from mappings m join public.workout_exercises source on source.id=m.source_id
where target.id=m.target_id and coalesce(trim(target.image_url),'')='';

commit;
