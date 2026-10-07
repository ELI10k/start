-- Replace the single onboarding lesson with the complete seven-part Life Fit
-- series. The original lesson ID remains lesson 1 so existing progress and
-- favorites stay attached; the profile shortcut opens this same ordered course.
begin;

update public.content_categories
set name = 'מתחילים כאן',
    description = 'שבעה מדריכים ברורים לשימוש עצמאי באפליקציית Life Fit.',
    cover_url = '/content/courses/start-guide/cover.jpg',
    sort_order = 0,
    active = true
where id = '20000000-0000-4000-8000-000000000001';

insert into public.content_items(
  id, title, description, category_id, category, content_type, thumbnail_url,
  body, media_url, published, status, sort_order, created_by, estimated_minutes,
  published_at
)
values
  (
    '10000000-0000-4000-8000-000000000004',
    'כניסה, מסך הבית וניווט',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'כניסה לאפליקציה, הצטרפות ראשונית, היכרות עם מסך הבית והניווט הראשי.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/01-login-home-navigation',
    true, 'published', 10, null, 4, now()
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'התפריט האישי והארוחות שלי',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'בחירת ארוחות ומאכלים, דיווח אכילה, סיכום יומי ויצירת ארוחות שמורות לשימוש חוזר.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/02-personal-menu-meals',
    true, 'published', 20, null, 6, now()
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'תזונה מחוץ לתפריט ורשימת קניות',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'דיווח על אוכל מחוץ לתפריט, חישוב פריטים ושימוש ברשימת הקניות.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/03-outside-menu-shopping',
    true, 'published', 30, null, 4, now()
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    'תוכנית האימונים וביצוע אימון',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'היכרות עם התרגילים, סטי חימום, סטים עובדים, חזרות, משקלים וטיימר המנוחה.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/04-workout-program-session',
    true, 'published', 40, null, 4, now()
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'ניהול אימונים והתקדמות',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'העברת אימון, סימון אימון שפוספס ומעקב אחר היסטוריה והתקדמות בתרגילים.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/05-workout-management-progress',
    true, 'published', 50, null, 3, now()
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'משקל, בריאות וצ׳ק־אין',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'עדכון משקל ומדידות, צעדים ושינה, והשלמת הצ׳ק־אין השבועי.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/06-measurements-health-checkin',
    true, 'published', 60, null, 4, now()
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'הודעות, תוכן, פרופיל ותמיכה',
    'סדרת ההדרכה של Life Fit',
    '20000000-0000-4000-8000-000000000001',
    'מתחילים כאן', 'video', '/content/courses/start-guide/cover.jpg',
    'שיחה עם המאמן, התראות, ספריית התוכן, הגדרות הפרופיל וקבלת תמיכה.',
    'https://start.elicohenfitness.co.il/media/life-fit-training/07-messages-content-profile-support',
    true, 'published', 70, null, 5, now()
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
set status = 'archived', published = false
where category_id = '20000000-0000-4000-8000-000000000001'
  and id not in (
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000010'
  );

notify pgrst, 'reload schema';

commit;
