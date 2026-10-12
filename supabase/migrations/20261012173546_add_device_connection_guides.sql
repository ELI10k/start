-- Add the two platform-specific device connection guides after the existing
-- seven-part onboarding series. Existing lesson IDs, progress and ordering stay
-- unchanged; these are new forward-only rows.
begin;

update public.content_categories
set description = 'תשעה מדריכים ברורים לשימוש עצמאי באפליקציית Life Fit.'
where id = '20000000-0000-4000-8000-000000000001';

insert into public.content_items(
  id, title, description, category_id, category, content_type, thumbnail_url,
  body, media_url, published, status, sort_order, created_by, estimated_minutes,
  published_at
)
values
  (
    '10000000-0000-4000-8000-000000000011',
    'חיבור שעון ומכשיר כושר באייפון',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'חיבור שעון, צמיד, טבעת חכמה או האייפון עצמו דרך Apple Health, כולל צעדים ושינה.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/08-connect-device-iphone',
    true, 'published', 80, null, 1, now()
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    'חיבור שעון ומכשיר כושר באנדרואיד',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'חיבור שעון, צמיד, טבעת חכמה או טלפון Android דרך Health Connect, כולל צעדים ושינה.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/09-connect-device-android',
    true, 'published', 90, null, 1, now()
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category_id = excluded.category_id,
  category = excluded.category,
  content_type = excluded.content_type,
  thumbnail_url = excluded.thumbnail_url,
  body = excluded.body,
  media_url = excluded.media_url,
  published = excluded.published,
  status = excluded.status,
  sort_order = excluded.sort_order,
  estimated_minutes = excluded.estimated_minutes,
  published_at = coalesce(public.content_items.published_at, excluded.published_at);

notify pgrst, 'reload schema';

commit;
