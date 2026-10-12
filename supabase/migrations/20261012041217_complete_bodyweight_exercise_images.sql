begin;

-- Replace legacy YouTube thumbnails and the mismatched calf poster with
-- original, self-hosted male exercise photography. Exercise identities,
-- programming metadata and video sources remain unchanged.
update public.workout_exercises as exercise
set
  image_url = 'https://start.elicohenfitness.co.il' || replacement.image_path,
  updated_at = now()
from (
  values
    ('exercise-p2ohuv', '/exercises/bodyweight/bicycle-crunch.jpg'),
    ('bodyweight-standing-calf-raise', '/exercises/bodyweight/standing-calf-raise.jpg'),
    ('exercise-1urdov4', '/exercises/bodyweight/leg-raise.jpg'),
    ('exercise-155pu7s', '/exercises/warmup/dynamic-warmup.jpg'),
    ('exercise-1k0kcxw', '/exercises/bodyweight/close-grip-pushup.jpg'),
    ('exercise-8q99c1', '/exercises/bodyweight/close-grip-pushup.jpg'),
    ('exercise-pn4ire', '/exercises/bodyweight/crunch.jpg'),
    ('exercise-1fo5t9c', '/exercises/bodyweight/bodyweight-curl.jpg'),
    ('exercise-2ez0zf', '/exercises/bodyweight/lunge.jpg'),
    ('exercise-1rpyv0f', '/exercises/bodyweight/pike-pushup.jpg'),
    ('exercise-1wwie67', '/exercises/bodyweight/wide-pike-pushup.jpg'),
    ('exercise-1ba2nb8', '/exercises/bodyweight/pullup.jpg'),
    ('exercise-say88l', '/exercises/bodyweight/narrow-pullup.jpg'),
    ('exercise-1igvlte', '/exercises/bodyweight/wide-pullup.jpg'),
    ('exercise-1oguz0o', '/exercises/bodyweight/sumo-squat.jpg'),
    ('exercise-n1izh5', '/exercises/bodyweight/squat.jpg'),
    ('exercise-150pt7l', '/exercises/bodyweight/decline-pushup.jpg'),
    ('exercise-dhk3wr', '/exercises/bodyweight/incline-pushup.jpg'),
    ('exercise-hdg3yz', '/exercises/bodyweight/pushup.jpg')
) as replacement(id, image_path)
where exercise.id = replacement.id;

commit;
