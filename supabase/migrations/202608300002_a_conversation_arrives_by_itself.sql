-- A thread that only updates when you reload is a form, not a conversation.
--
-- Every message and every notification is already written to a table with its
-- own row-level security. Realtime can stream those inserts to the browser, and
-- when it does it re-checks the same SELECT policies against the subscriber -
-- so a client is told about their own thread and nobody else's, by exactly the
-- rules that already decide what the screen may show.
--
-- Adding a table to the publication is all that is needed; the policies are
-- untouched and nothing new is readable.
--
-- Impact: two tables begin emitting change events to subscribers who could
-- already read the rows. No schema change, no policy change.
-- Rollback: alter publication supabase_realtime drop table
--             public.coach_client_messages, public.notifications;

begin;

-- `replica identity full` so a subscriber is handed the whole row rather than
-- only its primary key. The screens read the row's own fields to decide whether
-- anything changed for them.
alter table public.coach_client_messages replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'coach_client_messages'
  ) then
    alter publication supabase_realtime add table public.coach_client_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  -- A local database without Supabase's own publication is not a broken
  -- migration; the feature simply has nothing to attach to there.
  when undefined_object then raise notice 'supabase_realtime publication is absent; skipping';
end $$;

commit;
