-- Point the published onboarding lesson at the refreshed guide. The versioned
-- query string invalidates any cached redirect while the stable route remains
-- the single media URL used by both the course and the profile shortcut.
-- Rollback: restore media_url to the same path without ?v=2.
begin;

update public.content_items
set media_url = 'https://start.elicohenfitness.co.il/media/life-fit-guide.mp4?v=2',
    estimated_minutes = 3
where id = '10000000-0000-4000-8000-000000000004';

commit;
