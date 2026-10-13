-- Add the nutrition day-strip explainer as lesson 3 without replacing any
-- existing lesson IDs. Existing viewing progress stays attached while the
-- later lessons move down one position and support remains last.
begin;

update public.content_categories
set description = 'עשרה מדריכים ברורים לשימוש עצמאי באפליקציית Life Fit.'
where id = '20000000-0000-4000-8000-000000000001'::uuid;

insert into public.content_items(
  id, title, description, category_id, category, content_type, thumbnail_url,
  body, media_url, published, status, sort_order, created_by, estimated_minutes,
  published_at
)
values (
  '10000000-0000-4000-8000-000000000013'::uuid,
  'סרגל הימים ומעקב תזונה שבועי',
  'סדרת ההדרכה של Life Fit',
  '20000000-0000-4000-8000-000000000001'::uuid,
  'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
  'זיהוי היום הנוכחי, משמעות החיווי הירוק והאדום, ופתיחת יום קודם לבדיקה או לתיקון דיווח.',
  'https://start.elicohenfitness.co.il/media/life-fit-training/03-nutrition-day-status',
  true, 'published', 30, null, 1, now()
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

update public.content_items
set sort_order = case id
  when '10000000-0000-4000-8000-000000000004'::uuid then 10
  when '10000000-0000-4000-8000-000000000005'::uuid then 20
  when '10000000-0000-4000-8000-000000000013'::uuid then 30
  when '10000000-0000-4000-8000-000000000006'::uuid then 40
  when '10000000-0000-4000-8000-000000000007'::uuid then 50
  when '10000000-0000-4000-8000-000000000008'::uuid then 60
  when '10000000-0000-4000-8000-000000000009'::uuid then 70
  when '10000000-0000-4000-8000-000000000011'::uuid then 80
  when '10000000-0000-4000-8000-000000000012'::uuid then 90
  when '10000000-0000-4000-8000-000000000010'::uuid then 100
end
where category_id = '20000000-0000-4000-8000-000000000001'::uuid
  and id in (
    '10000000-0000-4000-8000-000000000004'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid,
    '10000000-0000-4000-8000-000000000006'::uuid,
    '10000000-0000-4000-8000-000000000007'::uuid,
    '10000000-0000-4000-8000-000000000008'::uuid,
    '10000000-0000-4000-8000-000000000009'::uuid,
    '10000000-0000-4000-8000-000000000010'::uuid,
    '10000000-0000-4000-8000-000000000011'::uuid,
    '10000000-0000-4000-8000-000000000012'::uuid,
    '10000000-0000-4000-8000-000000000013'::uuid
  );

notify pgrst, 'reload schema';

commit;
