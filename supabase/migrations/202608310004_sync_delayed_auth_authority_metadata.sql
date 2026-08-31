begin;

-- GoTrue may create auth.users before attaching app_metadata. The INSERT
-- trigger therefore sees no trusted role and correctly provisions a disabled
-- client, but nothing used to reconcile the row when the service-role update
-- arrived milliseconds later. Only app_metadata is watched: ordinary users can
-- edit user_metadata, never app_metadata.
create or replace function public.sync_delayed_auth_authority_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.user_role;
  v_requested_role text := lower(coalesce(new.raw_app_meta_data->>'role', ''));
  v_is_test_account boolean := coalesce((new.raw_app_meta_data->>'is_test_account')::boolean, false);
begin
  if v_requested_role not in ('coach', 'client') then return new; end if;
  v_role := v_requested_role::public.user_role;

  update public.profiles
  set role = v_role,
      status = 'active',
      is_test_account = v_is_test_account,
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

drop trigger if exists on_auth_user_authority_metadata_updated on auth.users;
create trigger on_auth_user_authority_metadata_updated
after update of raw_app_meta_data on auth.users
for each row
when (new.raw_app_meta_data is distinct from old.raw_app_meta_data)
execute function public.sync_delayed_auth_authority_metadata();

commit;
