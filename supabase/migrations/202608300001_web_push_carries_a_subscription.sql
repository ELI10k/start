-- A web push "token" is four values, not one.
--
-- APNs and FCM hand the app a single opaque string. The browser hands it a
-- subscription: an endpoint URL belonging to the browser vendor's push service,
-- plus the two keys a message has to be encrypted against - `p256dh` and
-- `auth`. Without those keys nothing can be sent, so they have to be stored
-- with the device, and the column that holds them is the one that already
-- exists.
--
-- So a web-push device stores the whole subscription, JSON-encoded, in `token`.
-- The endpoint inside it is what makes the row unique, exactly as a native
-- token is; nothing else in the pipeline changes, because everything downstream
-- treats the token as an opaque string it hands to the transport.
--
-- The only thing in the way was the length check: 512 characters is generous
-- for an APNs token and not enough for an endpoint plus two keys plus JSON.
--
-- Impact: one CHECK constraint widened. No existing row changes meaning, and no
-- existing value comes near the new ceiling.
-- Rollback: alter table public.push_devices
--             drop constraint push_devices_token_check,
--             add constraint push_devices_token_check
--             check (length(trim(token)) between 8 and 512);

begin;

alter table public.push_devices
  drop constraint if exists push_devices_token_check;
alter table public.push_devices
  add constraint push_devices_token_check
  check (length(trim(token)) between 8 and 4096);

-- The same ceiling on the way in. The function refused nothing above 512 - the
-- constraint did - but it states the lower bound itself, so it should state the
-- upper one too rather than letting a valid subscription fail at the table.
create or replace function public.register_push_device(p_token text, p_platform text, p_provider text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authorized'; end if;
  if p_platform not in ('ios','android','web') then raise exception 'invalid_platform'; end if;
  if p_provider not in ('apns','fcm','web-push') then raise exception 'invalid_provider'; end if;
  if p_token is null or length(trim(p_token)) not between 8 and 4096 then raise exception 'invalid_token'; end if;

  insert into public.push_devices(user_id, token, platform, provider)
  values (auth.uid(), trim(p_token), p_platform, p_provider)
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, provider = excluded.provider,
        enabled = true, last_seen_at = now()
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.register_push_device(text,text,text) from public;
grant execute on function public.register_push_device(text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
