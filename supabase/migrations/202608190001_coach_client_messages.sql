-- A direct channel between a coach and a client.
--
-- Until now the product had none. The only thing that travelled from a coach to
-- a client was the "coach_response" field on a weekly check-in: one direction,
-- once a week, with no way to reply. Everything else - a client stuck at the
-- supermarket, a question about a substitution, "I injured my shoulder" - left
-- the app entirely and happened on WhatsApp.
--
-- Impact: additive only. One new table, three new functions, and one widened
-- CHECK constraint on notifications.type. No existing table, column, policy or
-- function changes meaning, and nothing already stored is rewritten. An older
-- build of the app running against this schema behaves exactly as it does now:
-- it simply never reads the new table.
--
-- Backward compatibility: the notifications.type constraint is only ever
-- widened - every value it accepted before it still accepts - so rows written by
-- the current production build keep validating.
--
-- Rollback: supabase/seeds/coach-client-messages-rollback.sql

begin;

create table if not exists public.coach_client_messages (
  id uuid primary key default gen_random_uuid(),
  -- Both sides of the thread are stored, not just the sender, so a thread stays
  -- readable after a coach hands a client over: the row says who it was between.
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  -- Where the message came from. A client writing from the support screen and a
  -- client asking to have their weight corrected are different conversations to
  -- a coach triaging twenty of them, and the screen can say which is which.
  topic text not null default 'general' check (topic in ('general', 'support', 'profile_update')),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint coach_client_messages_sender_is_party check (sender_id in (coach_id, client_id))
);

-- The thread screen reads one client's messages newest-first, every time.
create index if not exists coach_client_messages_thread_idx
  on public.coach_client_messages (client_id, created_at desc);
-- The coach inbox counts unread messages per coach.
create index if not exists coach_client_messages_unread_idx
  on public.coach_client_messages (coach_id, read_at)
  where read_at is null;

alter table public.coach_client_messages enable row level security;

-- A client sees their own thread. A coach sees the threads of the clients they
-- currently hold an active relationship with - the same gate every other coach
-- read in this schema goes through.
drop policy if exists coach_client_messages_select on public.coach_client_messages;
create policy coach_client_messages_select on public.coach_client_messages
  for select to authenticated
  using (client_id = auth.uid() or public.is_coach_for(client_id));

-- No insert, update or delete policy exists on purpose. Writing goes through the
-- functions below, which decide the counterparty themselves - so neither side
-- can post a message into someone else's thread or forge the sender.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'meal_plan_assigned','workout_assigned','check_in_submitted','check_in_reviewed',
  'progress_updated','check_in_reminder','weight_reminder','content_published',
  'workout_morning_reminder','workout_evening_reminder','workout_snooze',
  'workout_skipped','workout_moved','meal_reminder','end_of_day_reminder',
  'weekly_achievement','coach_message','direct_message'));

-- Sends one message and tells the other side it is there.
--
-- The caller never names both parties: a client names nobody and their active
-- coach is looked up, a coach names only the client and is checked against the
-- same relationship. The sender is always auth.uid(), so a forged "from" is not
-- expressible through this interface.
create or replace function public.send_coach_client_message(
  p_body text, p_topic text default 'general', p_client_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.current_role();
  v_coach_id uuid;
  v_client_id uuid;
  v_id uuid;
  v_sender_name text;
  v_href text;
  v_recipient uuid;
begin
  if length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'empty_message'; end if;
  if length(btrim(p_body)) > 4000 then raise exception 'message_too_long'; end if;
  if coalesce(p_topic, 'general') not in ('general', 'support', 'profile_update') then
    raise exception 'invalid_topic';
  end if;

  if v_role = 'client' then
    v_client_id := auth.uid();
    select coach_id into v_coach_id from public.coach_client_relationships
      where client_id = v_client_id and status = 'active' limit 1;
    if v_coach_id is null then raise exception 'no_active_coach'; end if;
    v_recipient := v_coach_id;
  elsif v_role = 'coach' then
    if p_client_id is null then raise exception 'client_required'; end if;
    if not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
    v_coach_id := auth.uid();
    v_client_id := p_client_id;
    v_recipient := v_client_id;
  else
    raise exception 'not_authorized';
  end if;

  insert into public.coach_client_messages(coach_id, client_id, sender_id, topic, body)
  values (v_coach_id, v_client_id, auth.uid(), coalesce(p_topic, 'general'), btrim(p_body))
  returning id into v_id;

  select full_name into v_sender_name from public.profiles where id = auth.uid();
  -- Each side is sent to the screen where the thread actually lives.
  v_href := case when v_recipient = v_client_id
    then '/messages'
    else '/coach/clients/' || v_client_id::text || '?tab=messages' end;

  -- Category 'system': a message from your coach is not a nutrition tip, and
  -- must not be silenced by the nutrition toggle.
  perform public.create_in_app_notification(
    v_recipient, auth.uid(), 'system', 'direct_message',
    coalesce(v_sender_name, 'הודעה חדשה'),
    left(btrim(p_body), 160),
    v_href, 'coach_client_messages', v_id::text, null);

  return v_id;
end $$;

-- Marks everything the other side wrote in this thread as read. Only the
-- recipient's own rows are touched: reading your own message is not an event.
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
  return v_count;
end $$;

-- How many messages are waiting, for the badge. A client asks about their own
-- thread; a coach asks about every client they hold.
create or replace function public.unread_message_count()
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.coach_client_messages m
  where m.read_at is null
    and m.sender_id <> auth.uid()
    and (m.client_id = auth.uid() or public.is_coach_for(m.client_id))
$$;

revoke all on function
  public.send_coach_client_message(text, text, uuid),
  public.mark_message_thread_read(uuid),
  public.unread_message_count() from public;
grant execute on function
  public.send_coach_client_message(text, text, uuid),
  public.mark_message_thread_read(uuid),
  public.unread_message_count() to authenticated;

notify pgrst, 'reload schema';
commit;
