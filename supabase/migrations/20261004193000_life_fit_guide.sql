begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  52428800,
  array['video/mp4', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update public.content_categories
set name = 'מתחילים כאן',
    description = 'מדריך קצר וברור לשימוש עצמאי באפליקציית Life Fit.',
    cover_url = '/content/courses/start-guide/cover.jpg',
    sort_order = 0,
    active = true
where id = '20000000-0000-4000-8000-000000000001';

update public.content_items
set status = 'archived',
    published = false
where category_id = '20000000-0000-4000-8000-000000000001'
  and id <> '10000000-0000-4000-8000-000000000004';

insert into public.content_items(
  id, title, description, category_id, category, content_type, thumbnail_url,
  body, media_url, published, status, sort_order, created_by, estimated_minutes,
  published_at
)
values (
  '10000000-0000-4000-8000-000000000004',
  'איך משתמשים ב־Life Fit',
  'מדריך מלא לתזונה, אימונים, מעקב והקשר עם המאמן.',
  '20000000-0000-4000-8000-000000000001',
  'מתחילים כאן',
  'video',
  '/content/courses/start-guide/cover.jpg',
  'צפו במדריך לפני תחילת השימוש כדי להכיר את הפעולות המרכזיות באפליקציה.',
  'https://start.elicohenfitness.co.il/media/life-fit-guide.mp4',
  true,
  'published',
  0,
  null,
  3,
  now()
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
