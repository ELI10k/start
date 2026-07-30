begin;

-- A coach may see the latest active session only for clients directly assigned
-- to that coach. This powers the real "last login" dashboard field without
-- exposing sessions of unrelated users.
create index if not exists device_sessions_user_seen_idx
  on public.device_sessions(user_id, last_seen_at desc)
  where revoked_at is null;

drop policy if exists devices_coach_assigned_select on public.device_sessions;
create policy devices_coach_assigned_select on public.device_sessions
  for select to authenticated
  using (public.is_coach_for(user_id));

notify pgrst, 'reload schema';

commit;
