begin;

alter table public.profiles
  add column is_test_account boolean not null default false;

create index profiles_test_accounts_idx
  on public.profiles(is_test_account, role, status)
  where is_test_account;

create or replace function public.protect_profile_authority() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and (
    new.role <> old.role
    or new.status <> old.status
    or new.id <> old.id
    or new.is_test_account <> old.is_test_account
  ) then
    raise exception 'profile_authority_fields_are_server_managed';
  end if;
  return new;
end $$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_role public.user_role;
  v_status public.profile_status;
  v_requested_role text := lower(coalesce(new.raw_app_meta_data->>'role', ''));
  v_full_name text;
  v_is_test_account boolean := coalesce((new.raw_app_meta_data->>'is_test_account')::boolean, false);
begin
  if v_requested_role in ('coach', 'client') then
    v_role := v_requested_role::public.user_role;
    v_status := 'active';
  else
    v_role := 'client';
    v_status := 'disabled';
    v_is_test_account := false;
  end if;
  v_full_name := trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_app_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'משתמש'));
  if length(v_full_name) < 2 then v_full_name := 'משתמש START'; end if;

  insert into public.profiles(id, email, full_name, role, status, is_test_account)
  values(new.id, lower(coalesce(new.email, new.id::text || '@invalid.local')), v_full_name, v_role, v_status, v_is_test_account)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role)
  values(new.id, v_role)
  on conflict(user_id) do update set role = excluded.role, updated_at = now();
  if v_role = 'client' then
    insert into public.client_profiles(user_id) values(new.id) on conflict(user_id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.validate_coach_client_roles() returns trigger
language plpgsql set search_path = public as $$
declare
  v_coach_is_test boolean;
  v_client_is_test boolean;
begin
  select is_test_account into v_coach_is_test
  from public.profiles
  where id = new.coach_id and role = 'coach';
  if v_coach_is_test is null then raise exception 'relationship_requires_coach'; end if;

  select is_test_account into v_client_is_test
  from public.profiles
  where id = new.client_id and role = 'client';
  if v_client_is_test is null then raise exception 'relationship_requires_client'; end if;

  if v_coach_is_test is distinct from v_client_is_test then
    raise exception 'test_account_tenant_boundary';
  end if;
  return new;
end $$;

create or replace function public.disable_e2e_test_accounts() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update public.profiles
  set status = 'disabled'
  where is_test_account and status <> 'disabled';
  get diagnostics v_count = row_count;

  update public.device_sessions
  set revoked_at = now()
  where revoked_at is null
    and user_id in (select id from public.profiles where is_test_account);
  return v_count;
end $$;

revoke all on function public.disable_e2e_test_accounts() from public, anon, authenticated;
grant execute on function public.disable_e2e_test_accounts() to service_role;

notify pgrst, 'reload schema';
commit;
