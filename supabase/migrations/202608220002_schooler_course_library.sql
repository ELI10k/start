begin;

-- The course library becomes a shelf, and a shelf needs cover art.
--
-- Until now a course borrowed the thumbnail of whichever lesson happened to
-- carry one, so the art on the library screen changed whenever a lesson was
-- reordered - and a course whose lessons had no thumbnails showed a bare icon.
-- The artwork belongs to the course, not to a lesson inside it.
alter table public.content_categories
  add column if not exists cover_url text;

-- The eleven courses of מועדון החטובים, in the order they appear on the
-- school's own shelf. Names, order and artwork are Eli's; the lessons inside
-- each course are inserted separately as they are imported, so a course with
-- no lessons yet simply does not surface on the library screen.
insert into public.content_categories(id, name, slug, description, cover_url, sort_order, active)
values
  ('20000000-0000-4000-8000-000000000101', 'כל מה שצריך לדעת על המשקל שלך', 'weight-basics',
   'הבסיס: מה באמת קובע את המשקל שלך ואיך קוראים את המספרים נכון.',
   '/content/courses/weight-basics/cover.png', 10, true),
  ('20000000-0000-4000-8000-000000000102', 'תזונה', 'nutrition-course',
   'אבות המזון, חלבון, פחמימות ושומן — איך מרכיבים תזונה שאפשר לחיות איתה.',
   '/content/courses/nutrition/cover.jpg', 20, true),
  ('20000000-0000-4000-8000-000000000103', 'אימונים', 'training-course',
   'איך לאמן את הגוף נכון: עצימות, נפח והתקדמות לאורך זמן.',
   '/content/courses/training/cover.png', 30, true),
  ('20000000-0000-4000-8000-000000000104', 'מדע השינה', 'sleep-science',
   'האופטימיזציה המלאה של השינה לשריפת שומן ולבניית שריר.',
   '/content/courses/sleep-science/cover.jpg', 40, true),
  ('20000000-0000-4000-8000-000000000105', 'איך לזהות את הגנטיקה שלך', 'body-type',
   'מבנה הגוף שלך והדרך הנכונה עבורו לשרוף שומן ולבנות גוף חטוב.',
   '/content/courses/body-type/cover.jpg', 60, true),
  ('20000000-0000-4000-8000-000000000106', 'מיינדסט והטמעת הרגלים', 'mindset-habits',
   'הראש שמחזיק את התהליך: הרגלים לירידה במשקל ולשימור שלו.',
   '/content/courses/mindset-habits/cover.png', 70, true),
  ('20000000-0000-4000-8000-000000000107', 'מדריכים', 'guides',
   'מדריכים וחומרי עבודה להורדה.',
   '/content/courses/guides/cover.png', 80, true),
  ('20000000-0000-4000-8000-000000000108', 'שאלות ותשובות תזונה', 'nutrition-qa',
   'התשובות לשאלות שחוזרות הכי הרבה בתזונה.',
   '/content/courses/nutrition-qa/cover.jpg', 90, true),
  ('20000000-0000-4000-8000-000000000109', 'שאלות ותשובות אימונים', 'training-qa',
   'התשובות לשאלות שחוזרות הכי הרבה באימונים.',
   '/content/courses/training-qa/cover.jpg', 100, true),
  ('20000000-0000-4000-8000-000000000110', 'ראיונות פודקאסט כושר ותזונה', 'podcast',
   'שיחות מלאות על כושר ותזונה, להאזנה תוך כדי תנועה.',
   '/content/courses/podcast/cover.png', 110, true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  cover_url = excluded.cover_url,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- EAT 2 already arrived from the same school; it keeps its rows and its three
-- lessons, and only takes its place in the shelf order and gains its artwork.
update public.content_categories
set cover_url = '/content/courses/eat-2/schooler-cover.jpg',
    sort_order = 50
where slug = 'eat-2';

-- The three introduction courses that shipped with the library move behind the
-- coach's own catalogue rather than in front of it.
update public.content_categories
set sort_order = 900 + sort_order
where slug in ('start-guide', 'habits-progress', 'nutrition-training')
  and sort_order < 900;

notify pgrst, 'reload schema';
commit;
