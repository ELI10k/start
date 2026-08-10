-- Push, up to the point where a credential is needed.
--
-- Every in-app notification already carries a recipient, a category and an href.
-- This adds the two pieces push needs on top of that: the devices to send to,
-- and an outbox row per device per notification. A trigger fills the outbox when
-- a notification is created, so by the time APNs and FCM credentials exist the
-- only missing step is the send itself.
--
-- Nothing here reaches the network. Rows stay 'pending' until a dispatcher
-- claims them.
--
-- Rollback: drop trigger notifications_queue_push on public.notifications;
--           drop function public.queue_push_deliveries();
--           drop function public.register_push_device(text,text,text);
--           drop function public.remove_push_device(text);
--           drop function public.claim_push_deliveries(integer);
--           drop function public.mark_push_delivery(uuid,text,text);
--           drop table public.push_deliveries;
--           drop table public.push_devices;
--           alter table public.notification_preferences drop column push;

begin;

alter table public.notification_preferences
  add column if not exists push boolean not null default true;

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- The provider's token. Unique on its own: the same handset re-installed, or
  -- handed to another person, must not end up addressed twice.
  token text not null unique check (length(trim(token)) between 8 and 512),
  platform text not null check (platform in ('ios', 'android', 'web')),
  provider text not null check (provider in ('apns', 'fcm', 'web-push')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists push_devices_user_enabled_idx on public.push_devices(user_id, enabled);

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.push_devices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  detail text,
  attempts smallint not null default 0,
  attempted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, device_id)
);
create index if not exists push_deliveries_pending_idx on public.push_deliveries(created_at) where status = 'pending';

alter table public.push_devices enable row level security;
alter table public.push_deliveries enable row level security;

-- A device row is the user's own. Deliveries are readable by the addressee and
-- written only by the dispatcher, which runs as the service role.
drop policy if exists push_devices_self on public.push_devices;
create policy push_devices_self on public.push_devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_deliveries_self_read on public.push_deliveries;
create policy push_deliveries_self_read on public.push_deliveries
  for select to authenticated
  using (exists (select 1 from public.push_devices d where d.id = device_id and d.user_id = (select auth.uid())));

-- Registering the same token again is a refresh, not a second device. Tokens
-- move between users when a handset changes hands, so the row is re-pointed
-- rather than duplicated.
create or replace function public.register_push_device(p_token text, p_platform text, p_provider text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  if p_platform not in ('ios','android','web') then raise exception 'invalid_platform'; end if;
  if p_provider not in ('apns','fcm','web-push') then raise exception 'invalid_provider'; end if;
  if p_token is null or length(trim(p_token)) < 8 then raise exception 'invalid_token'; end if;

  insert into public.push_devices(user_id, token, platform, provider)
  values (auth.uid(), trim(p_token), p_platform, p_provider)
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, provider = excluded.provider,
        enabled = true, last_seen_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- Its own switch rather than a fourteenth argument on
-- save_notification_preferences: the category preferences are a form the client
-- submits, this is a toggle the app flips when a device registers or the client
-- turns the buzzing off.
create or replace function public.set_push_preference(p_push boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  insert into public.notification_preferences(user_id, push) values (auth.uid(), coalesce(p_push, true))
  on conflict (user_id) do update set push = excluded.push, updated_at = now();
end $$;

create or replace function public.remove_push_device(p_token text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  delete from public.push_devices where token = trim(p_token) and user_id = auth.uid();
end $$;

-- One outbox row per enabled device, created with the notification itself so a
-- send can never disagree with what the client sees in the app. The category
-- preference is honoured here, and push has its own switch on top of it: a
-- client can keep in-app notifications and refuse the buzzing.
create or replace function public.queue_push_deliveries()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.notification_enabled(new.recipient_id, new.category) then return new; end if;
  if not coalesce((select push from public.notification_preferences where user_id = new.recipient_id), true) then return new; end if;

  insert into public.push_deliveries(notification_id, device_id)
  select new.id, d.id from public.push_devices d where d.user_id = new.recipient_id and d.enabled
  on conflict (notification_id, device_id) do nothing;
  return new;
end $$;

drop trigger if exists notifications_queue_push on public.notifications;
create trigger notifications_queue_push after insert on public.notifications
  for each row execute function public.queue_push_deliveries();

-- The dispatcher's two calls. Claiming marks rows in flight so two overlapping
-- runs cannot send the same notification twice.
create or replace function public.claim_push_deliveries(p_limit integer default 50)
returns table (delivery_id uuid, token text, platform text, provider text, title text, body text, href text, category text)
language plpgsql security definer set search_path=public as $$
begin
  return query
  with claimed as (
    update public.push_deliveries pd
    set status = 'pending', attempts = pd.attempts + 1, attempted_at = now()
    where pd.id in (
      select id from public.push_deliveries
      where status = 'pending' and attempts < 3
      order by created_at
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked
    )
    returning pd.id, pd.notification_id, pd.device_id
  )
  select c.id, d.token, d.platform, d.provider, n.title, n.body, n.href, n.category
  from claimed c
  join public.push_devices d on d.id = c.device_id
  join public.notifications n on n.id = c.notification_id;
end $$;

create or replace function public.mark_push_delivery(p_delivery_id uuid, p_status text, p_detail text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_status not in ('sent','failed','skipped') then raise exception 'invalid_status'; end if;
  update public.push_deliveries set status = p_status, detail = left(coalesce(p_detail,''), 500), attempted_at = now()
  where id = p_delivery_id;
  -- A token the provider rejected is dead. Disabling it stops every future send
  -- to a handset that no longer exists.
  if p_status = 'failed' and coalesce(p_detail,'') ilike '%unregistered%' then
    update public.push_devices set enabled = false
    where id = (select device_id from public.push_deliveries where id = p_delivery_id);
  end if;
end $$;

revoke all on table public.push_devices, public.push_deliveries from anon, authenticated;
grant select, insert, update, delete on table public.push_devices to authenticated;
grant select on table public.push_deliveries to authenticated;
revoke all on function public.register_push_device(text,text,text), public.remove_push_device(text), public.set_push_preference(boolean) from public;
grant execute on function public.register_push_device(text,text,text), public.remove_push_device(text), public.set_push_preference(boolean) to authenticated;
-- The dispatcher runs as the service role; no authenticated grant.
revoke all on function public.claim_push_deliveries(integer), public.mark_push_delivery(uuid,text,text) from public, authenticated;

commit;
