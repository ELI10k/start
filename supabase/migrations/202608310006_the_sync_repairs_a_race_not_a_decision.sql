begin;

-- The metadata sync repairs a race. It must not overturn a decision.
--
-- 202608310004 added a trigger for a real problem: GoTrue can create auth.users
-- before app_metadata is attached, so handle_new_auth_user sees no trusted role
-- and provisions a disabled client, and nothing reconciled the row when the
-- service-role update landed milliseconds later.
--
-- But it reconciled with `set status = 'active'` and no condition at all, on
-- every update to raw_app_meta_data for the rest of the account's life. So:
--
--   * a client the coach paused came back active the next time anything wrote
--     app_metadata - and provision-e2e-test-accounts.mjs and the test-account
--     branch of createCoachClient both do exactly that. The status check added
--     to getAuthContext in the same release was being undone from underneath.
--   * disable_e2e_test_accounts() sets status='disabled' to close a test
--     window. The trigger reopened it.
--   * is_test_account was recomputed as coalesce(<key>, false) and written over
--     the stored value, so any app_metadata write that did not repeat the key
--     cleared the flag. disable_e2e_test_accounts() selects `where
--     is_test_account`, so an account that lost the flag could never be closed
--     again - a live account with a known password and no way to shut it.
--
-- Two changes. The activation is scoped to the window the race actually lives
-- in - a row still in its provisioning state, moments after the user was
-- created - and the flag is written only when the key is present to write.

create or replace function public.sync_delayed_auth_authority_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.user_role;
  v_requested_role text := lower(coalesce(new.raw_app_meta_data->>'role', ''));
  v_has_test_flag boolean := new.raw_app_meta_data ? 'is_test_account';
  v_is_test_account boolean;
begin
  if v_requested_role not in ('coach', 'client') then return new; end if;
  v_role := v_requested_role::public.user_role;

  -- A malformed value must not raise: this trigger runs inside the UPDATE on
  -- auth.users, and an exception here fails the write that carries it - which
  -- can mean a sign-in that cannot complete.
  if v_has_test_flag then
    begin
      v_is_test_account := (new.raw_app_meta_data->>'is_test_account')::boolean;
    exception when others then
      v_has_test_flag := false;
    end;
  end if;

  -- The race, and only the race. Five minutes is far longer than the
  -- milliseconds it takes app_metadata to arrive, and far shorter than any
  -- interval in which a coach pauses somebody. Outside that window the stored
  -- status is a decision somebody made, and this trigger does not have an
  -- opinion about it.
  update public.profiles
  set role = v_role,
      status = case
        when status = 'disabled'
             and new.created_at > now() - interval '5 minutes'
        then 'active'
        else status
      end,
      is_test_account = case when v_has_test_flag then v_is_test_account else is_test_account end,
      updated_at = now()
  where id = new.id;

  insert into public.user_roles(user_id, role)
  values (new.id, v_role)
  on conflict(user_id) do update
    set role = excluded.role, updated_at = now();

  if v_role = 'client' then
    insert into public.client_profiles(user_id)
    values (new.id)
    on conflict(user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_delayed_auth_authority_metadata() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
