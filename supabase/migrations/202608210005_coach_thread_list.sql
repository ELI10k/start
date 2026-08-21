-- The coach's thread list, without a ceiling.
--
-- listCoachThreads read the 500 most recent messages the coach can see and
-- folded them into one row per client in TypeScript. With a handful of clients
-- that is every message they have ever exchanged. It stops being that quietly:
-- past 500, the oldest threads simply stop appearing in the list, and the unread
-- count on the ones that remain is short by whatever fell off the end. The
-- symptom is a client who wrote and does not appear - which is the exact failure
-- the inbox exists to prevent.
--
-- One row per thread, computed where the rows are. DISTINCT ON gives the last
-- message per client in one pass, and the unread count is an aggregate rather
-- than a loop. Security invoker, so the existing RLS policy is what decides
-- which threads are visible - a client sees their own, a coach sees the clients
-- they currently hold.
--
-- Impact: one new function and one index. No table, policy or existing function
-- changes. The old client-side path keeps working against the same data.
--
-- Rollback: supabase/seeds/coach-thread-list-rollback.sql

begin;

-- DISTINCT ON (client_id) ... ORDER BY client_id, created_at desc reads straight
-- down this index instead of sorting the table.
create index if not exists coach_client_messages_client_recent_idx
  on public.coach_client_messages (client_id, created_at desc);

create or replace function public.coach_message_threads()
returns table(
  client_id uuid,
  last_body text,
  last_at timestamptz,
  unread integer,
  awaiting_reply boolean
)
language sql stable security invoker set search_path = public as $$
  with last_message as (
    select distinct on (m.client_id)
      m.client_id, m.body, m.created_at, m.sender_id
    from public.coach_client_messages m
    order by m.client_id, m.created_at desc
  ),
  unread_counts as (
    select m.client_id, count(*)::integer as unread
    from public.coach_client_messages m
    where m.read_at is null and m.sender_id <> auth.uid()
    group by m.client_id
  )
  select
    l.client_id,
    l.body,
    l.created_at,
    coalesce(u.unread, 0),
    -- Whose turn it is. Reading a message answers "have I seen this"; it does
    -- not answer "have I replied", and those are different lists.
    l.sender_id <> auth.uid()
  from last_message l
  left join unread_counts u on u.client_id = l.client_id
  order by l.created_at desc
$$;

grant execute on function public.coach_message_threads() to authenticated;

notify pgrst, 'reload schema';
commit;
