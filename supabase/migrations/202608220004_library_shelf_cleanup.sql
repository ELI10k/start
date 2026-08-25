begin;

-- Two of the three courses that shipped as library scaffolding leave the shelf.
--
-- They were written to demonstrate that the library worked, not to be watched:
-- "היכרות עם START" and "הרגלים ומעקב" hold three short notes about the
-- library itself, and they sat between Eli's own courses. They are deactivated
-- rather than deleted, so the lessons, and any progress or favourite pointing
-- at them, survive and can be brought back by flipping one flag.
update public.content_categories
set active = false
where slug in ('start-guide', 'habits-progress', 'nutrition-training');

-- Every course now carries its own artwork, and every lesson that has no still
-- frame of its own falls back to it - so a PDF, a reel or a link reads as part
-- of the course it belongs to instead of as a blank tile.
update public.content_items i
set thumbnail_url = c.cover_url
from public.content_categories c
where i.category_id = c.id
  and c.cover_url is not null
  and (i.thumbnail_url is null or i.thumbnail_url = '');

notify pgrst, 'reload schema';
commit;
