-- The curated master list stopped being a list the moment it was used.
--
-- coach_food_usage.manual_favorite was `boolean not null default false`, and
-- record_coach_food_selection inserts a row the first time a coach picks a food.
-- The editor then decides favourites as:
--
--     usage exists ? usage.manual_favorite : food.isMaster
--
-- So the first time a coach chose a curated master food, a row appeared with
-- manual_favorite = false, and that food silently dropped out of the favourites
-- group for good. Choose enough of them and the group empties entirely - which is
-- what has happened to the E2E coach account, and is why the food picker there now
-- opens on "מזונות אחרונים" with no favourites above it.
--
-- This is the opposite of the stated rule: master foods are a curated priority
-- list, not something behaviour is allowed to edit. The column could not express
-- "the coach has no opinion", so use was indistinguishable from rejection.
--
-- Nullable fixes exactly that: null means no opinion and the curated status
-- stands, true is a food the coach starred themselves, false is one they
-- deliberately unstarred. Only the star writes true or false; selecting a food
-- never touches it.
--
-- Impact: one column loses NOT NULL and its default, and one function stops
-- writing a column it never meant to write. No row is rewritten by this
-- migration - see the note on the backfill below.
--
-- Backward compatibility: an older build reads null as falsy, which is the
-- behaviour it has today for an unstarred food. Nothing breaks; it simply does
-- not get the fix until it is deployed.
--
-- NOT INCLUDED HERE: converting the existing `false` rows back to null. Those
-- rows are a mix of the artefact above and genuine unstarring, and the two are
-- indistinguishable after the fact, so restoring them is a decision rather than a
-- migration. supabase/seeds/restore-master-food-favorites.sql does it for whoever
-- wants it, and says what it costs.
--
-- Rollback: supabase/seeds/master-foods-survive-use-rollback.sql

begin;

alter table public.coach_food_usage alter column manual_favorite drop default;
alter table public.coach_food_usage alter column manual_favorite drop not null;

-- Unchanged except for what it no longer does: the insert names only the columns
-- a selection is actually evidence of, so manual_favorite stays null and the
-- curated status survives being used.
create or replace function public.record_coach_food_selection(p_food_id text) returns void
language plpgsql security invoker set search_path=public as $$
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  if not exists(select 1 from public.foods where id=p_food_id) then raise exception 'food_not_found'; end if;
  insert into public.coach_food_usage(coach_id,food_id,selection_count,last_used_at)
  values(auth.uid(),p_food_id,1,now())
  on conflict(coach_id,food_id) do update set
    selection_count=public.coach_food_usage.selection_count+1,last_used_at=now();
end $$;

notify pgrst, 'reload schema';
commit;
