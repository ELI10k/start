-- Optional. Restores curated master foods that were demoted by being used.
--
-- Run this only if you want the favourites group repopulated. It sets
-- manual_favorite back to null for every row that says false, which means "no
-- opinion" again and lets the curated status stand.
--
-- What it costs: a food a coach deliberately unstarred also says false, and after
-- the fact the two are indistinguishable. Those unstarrings are undone and would
-- have to be redone by hand. In practice almost every false in this table is the
-- artefact rather than a decision - the bug demoted a food on first use, which is
-- far more common than deliberately unstarring one - but it is your call, which
-- is why this is not part of the migration.
--
-- Scoped to one coach:
--   ... where manual_favorite = false and coach_id = '<uuid>';

begin;

update public.coach_food_usage set manual_favorite = null where manual_favorite = false;

commit;
