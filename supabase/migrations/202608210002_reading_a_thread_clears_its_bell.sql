-- Reading the conversation is reading the notification about it.
--
-- A direct message writes two rows: the message, and a notification pointing at
-- the thread. Opening the thread marked the message read and left the
-- notification untouched, so the bell kept a badge for a message the client had
-- already read - permanently, until they went to the notifications screen and
-- cleared a notice about something they had done days earlier. The coach's side
-- behaved the same way.
--
-- The notification carries the message's id in source_id, and its source_table
-- names the channel, so the rows that describe a thread are already identifiable
-- from the thread. Marking them alongside the messages is the whole change.
--
-- Impact: one function replaced. No schema change. It only ever sets read_at on
-- rows belonging to the caller, and only for messages the caller did not write -
-- exactly the set it already marked on the other table.
--
-- Rollback: supabase/seeds/reading-a-thread-clears-its-bell-rollback.sql

begin;

create or replace function public.mark_message_thread_read(p_client_id uuid default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.current_role();
  v_client_id uuid;
  v_count integer;
begin
  if v_role = 'client' then
    v_client_id := auth.uid();
  elsif v_role = 'coach' then
    if p_client_id is null then raise exception 'client_required'; end if;
    if not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
    v_client_id := p_client_id;
  else
    raise exception 'not_authorized';
  end if;

  update public.coach_client_messages
    set read_at = now()
    where client_id = v_client_id and read_at is null and sender_id <> auth.uid();
  get diagnostics v_count = row_count;

  -- The bell entry for each of those messages. Scoped to this caller's own
  -- notifications, so marking a thread read can never touch anyone else's.
  update public.notifications n
    set read_at = now()
    where n.recipient_id = auth.uid()
      and n.read_at is null
      and n.source_table = 'coach_client_messages'
      and exists(
        select 1 from public.coach_client_messages m
        where m.id::text = n.source_id
          and m.client_id = v_client_id
          and m.sender_id <> auth.uid());

  return v_count;
end $$;

notify pgrst, 'reload schema';
commit;
