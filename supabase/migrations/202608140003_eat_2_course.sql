begin;

-- EAT 2 is an Eli Cohen course made available for START. This migration adds
-- one course category and its three source-backed lessons. It does not alter
-- existing content or permissions.
insert into public.content_categories(id, name, slug, description, sort_order, active)
values (
  '20000000-0000-4000-8000-000000000004',
  'סדנה להתקפי אכילה וזלילה',
  'eat-2',
  'קורס EAT 2 מאת אלי כהן: סדנה וכלי עבודה להתמודדות עם התקפי אכילה.',
  40,
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.content_items(
  id, title, description, category_id, category, content_type, thumbnail_url,
  body, media_url, published, status, sort_order, created_by, estimated_minutes
)
values
  (
    '30000000-0000-4000-8000-000000000041',
    'סדנה להתקפי אכילה רגשית',
    'שיעור 1 מתוך 3 · צפייה בסדנה המלאה.',
    '20000000-0000-4000-8000-000000000004',
    '',
    'video',
    '/content/courses/eat-2/cover.jpg',
    null,
    'https://www.youtube.com/watch?v=wglAaEN1qcA',
    true,
    'published',
    10,
    null,
    44
  ),
  (
    '30000000-0000-4000-8000-000000000042',
    'יומן אכילה להורדה',
    'שיעור 2 מתוך 3 · יומן עבודה להורדה ולמילוי.',
    '20000000-0000-4000-8000-000000000004',
    '',
    'article',
    '/content/courses/eat-2/cover.jpg',
    'הורידו את יומן האכילה, מלאו אותו בזמן אמת והשתמשו בו כדי לזהות דפוסים ללא שיפוטיות.',
    'https://my.schooler.biz/system/lessons/attachments/001/957/533/original/%D7%99%D7%95%D7%9E%D7%9F_%D7%90%D7%9B%D7%99%D7%9C%D7%94_%D7%95%D7%94%D7%9B%D7%A8%D7%94_%D7%A2%D7%9D_%D7%A2%D7%A6%D7%9E%D7%99.pdf?1722330487',
    true,
    'published',
    20,
    null,
    10
  ),
  (
    '30000000-0000-4000-8000-000000000043',
    'אפקט כדור השלג',
    'שיעור 3 מתוך 3 · דף עבודה להורדה.',
    '20000000-0000-4000-8000-000000000004',
    '',
    'article',
    '/content/courses/eat-2/cover.jpg',
    'דף העבודה מסכם את אפקט כדור השלג ומאפשר לתרגל עצירה וחזרה למסלול.',
    'https://my.schooler.biz/system/lessons/attachments/001/957/534/original/%D7%90%D7%A4%D7%A7%D7%98_%D7%9B%D7%93%D7%95%D7%A8_%D7%94%D7%A9%D7%9C%D7%92.pdf?1722330487',
    true,
    'published',
    30,
    null,
    10
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category_id = excluded.category_id,
  content_type = excluded.content_type,
  thumbnail_url = excluded.thumbnail_url,
  body = excluded.body,
  media_url = excluded.media_url,
  status = excluded.status,
  sort_order = excluded.sort_order,
  estimated_minutes = excluded.estimated_minutes;

commit;
