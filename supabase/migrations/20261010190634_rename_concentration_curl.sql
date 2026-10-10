begin;

-- This is a presentation-only correction. The stable exercise id, media,
-- programming references and anatomical classification remain unchanged.
update public.workout_exercises
set
  name = 'כפיפת מרפק עם משקולת יד בישיבה',
  normalized_name = 'כפיפת מרפק עם משקולת יד בישיבה',
  video = jsonb_set(
    coalesce(video, '{}'::jsonb),
    '{title}',
    to_jsonb('כפיפת מרפק עם משקולת יד בישיבה'::text),
    true
  ),
  aliases = array_remove(aliases, 'כפיפת מרפק בריכוז עם משקולת'),
  updated_at = now()
where id = 'biceps-dumbbell-concentration-curl';

update public.workout_exercises
set
  name = 'כפיפת מרפק עם גומיית התנגדות',
  normalized_name = 'כפיפת מרפק עם גומיית התנגדות',
  video = jsonb_set(
    coalesce(video, '{}'::jsonb),
    '{title}',
    to_jsonb('כפיפת מרפק עם גומיית התנגדות'::text),
    true
  ),
  execution_notes = replace(execution_notes, 'כפיפת ריכוז כנגד גומיה', 'כפיפת מרפק עם גומיית התנגדות'),
  how_to = replace(how_to, 'כפיפת ריכוז כנגד גומיה', 'כפיפת מרפק עם גומיית התנגדות'),
  aliases = array_remove(aliases, 'כפיפת ריכוז כנגד גומיה'),
  updated_at = now()
where id = 'resistance-band-concentration-curl';

commit;
