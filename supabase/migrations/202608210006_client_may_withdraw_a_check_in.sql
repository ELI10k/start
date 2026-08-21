-- A client may take back a check-in the coach has not answered.
--
-- check_ins carries an insert policy, a select policy and a coach update policy,
-- and no delete policy for anybody. So a client who mistyped their weight had
-- exactly one way to correct it: file a second check-in. 202608210004 closed that
-- door - one a week - and closing it without opening another leaves a client
-- looking at a wrong number until Sunday with nothing to do about it but write to
-- their coach and ask them to read around it.
--
-- Scoped as tightly as the correction requires:
--   * their own row only;
--   * only while coach_response is null - once the coach has written back, the
--     check-in is half of a conversation and deleting it would erase their reply
--     along with it;
--   * only while handled_at is null - a coach who marked it handled has acted on
--     it, and what they acted on should not be able to disappear underneath them.
--
-- Withdrawing is deliberately deletion rather than a status. A check-in the
-- client says never happened should not sit in the coach's queue in any form, and
-- the photo cycle counts rows - a withdrawn row left behind would go on shifting
-- "photos required" by one exactly as a duplicate did.
--
-- check_in_photos references check_ins with on delete cascade, so the photo rows
-- follow. The stored objects do not, and are removed by the action that calls
-- this - a leftover object is a tidiness problem, a stuck client is not.
--
-- Impact: one policy added. No table, function or existing policy changes. An
-- older build simply never issues the delete.
--
-- Rollback: supabase/seeds/client-may-withdraw-a-check-in-rollback.sql

begin;

drop policy if exists check_ins_self_delete on public.check_ins;
create policy check_ins_self_delete on public.check_ins
  for delete to authenticated
  using (
    client_id = (select auth.uid())
    and coach_response is null
    and handled_at is null
  );

grant delete on public.check_ins to authenticated;

notify pgrst, 'reload schema';
commit;
