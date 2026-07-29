begin;

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.user_role not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_roles_role_idx on public.user_roles(role, user_id);

insert into public.user_roles(user_id, role)
select id, role from public.profiles
on conflict(user_id) do update set role = excluded.role, updated_at = now();

create or replace function public.sync_profile_to_user_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles(user_id, role)
  values(new.id, new.role)
  on conflict(user_id) do update set role = excluded.role, updated_at = now()
  where public.user_roles.role is distinct from excluded.role;
  return new;
end $$;
create trigger profiles_sync_user_role after insert or update of role on public.profiles
for each row execute function public.sync_profile_to_user_role();

create or replace function public.sync_user_role_to_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = new.role
  where id = new.user_id and role is distinct from new.role;
  return new;
end $$;
create trigger user_roles_sync_profile after insert or update of role on public.user_roles
for each row execute function public.sync_user_role_to_profile();

create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_role public.user_role;
  v_status public.profile_status;
  v_requested_role text := lower(coalesce(new.raw_app_meta_data->>'role', ''));
  v_full_name text;
begin
  if v_requested_role in ('coach', 'client') then
    v_role := v_requested_role::public.user_role;
    v_status := 'active';
  else
    v_role := 'client';
    v_status := 'disabled';
  end if;
  v_full_name := trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_app_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'משתמש'));
  if length(v_full_name) < 2 then v_full_name := 'משתמש START'; end if;

  insert into public.profiles(id, email, full_name, role, status)
  values(new.id, lower(coalesce(new.email, new.id::text || '@invalid.local')), v_full_name, v_role, v_status)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role)
  values(new.id, v_role)
  on conflict(user_id) do update set role = excluded.role, updated_at = now();
  if v_role = 'client' then
    insert into public.client_profiles(user_id) values(new.id) on conflict(user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_email() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated after update of email on auth.users
for each row execute function public.sync_auth_user_email();

create or replace function public.validate_coach_client_roles() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists(select 1 from public.user_roles where user_id = new.coach_id and role = 'coach') then
    raise exception 'relationship_requires_coach';
  end if;
  if not exists(select 1 from public.user_roles where user_id = new.client_id and role = 'client') then
    raise exception 'relationship_requires_client';
  end if;
  return new;
end $$;
create trigger relationships_validate_roles before insert or update on public.coach_client_relationships
for each row execute function public.validate_coach_client_roles();

alter table public.user_roles enable row level security;
create policy user_roles_self_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_roles_assigned_client_select on public.user_roles for select to authenticated
  using (public.current_role() = 'coach' and public.is_coach_for(user_id));

revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

alter table public.device_sessions
  add column enforces_single_device boolean not null default false;
create unique index device_sessions_one_enforced_active_idx
  on public.device_sessions(user_id)
  where enforces_single_device and revoked_at is null;

create or replace function public.activate_current_device(p_device_id text, p_device_name text)
returns public.device_sessions language plpgsql security definer set search_path = public as $$
declare
  result public.device_sessions;
  user_role public.user_role;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(trim(p_device_id)) < 16 then raise exception 'invalid_device_id'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select role into user_role from public.user_roles where user_id = auth.uid();
  if user_role is null then raise exception 'profile_role_missing'; end if;
  if user_role = 'client' then
    update public.device_sessions
    set revoked_at = now()
    where user_id = auth.uid() and revoked_at is null and device_id <> p_device_id;
  end if;
  insert into public.device_sessions(user_id, device_id, device_name, last_seen_at, revoked_at, enforces_single_device)
  values(auth.uid(), trim(p_device_id), left(coalesce(nullif(trim(p_device_name), ''), 'דפדפן'), 120), now(), null, user_role = 'client')
  on conflict(user_id, device_id) do update set
    device_name = excluded.device_name,
    last_seen_at = now(),
    revoked_at = null,
    enforces_single_device = excluded.enforces_single_device
  returning * into result;
  return result;
end $$;

create or replace function public.deactivate_current_device(p_device_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.device_sessions set revoked_at = now()
  where user_id = auth.uid() and device_id = p_device_id and revoked_at is null;
end $$;

create or replace function public.reset_client_device(p_client_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach_for(p_client_id) or not exists(select 1 from public.user_roles where user_id = p_client_id and role = 'client') then
    raise exception 'not_authorized';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_client_id::text, 0));
  update public.device_sessions set revoked_at = now()
  where user_id = p_client_id and revoked_at is null;
end $$;

revoke all on function public.activate_current_device(text,text) from public;
revoke all on function public.deactivate_current_device(text) from public;
revoke all on function public.reset_client_device(uuid) from public;
grant execute on function public.activate_current_device(text,text) to authenticated;
grant execute on function public.deactivate_current_device(text) to authenticated;
grant execute on function public.reset_client_device(uuid) to authenticated;

revoke all on table public.profiles, public.coach_client_relationships, public.client_profiles, public.device_sessions from anon, authenticated;
grant select on table public.profiles, public.coach_client_relationships, public.client_profiles, public.device_sessions to authenticated;
grant update(full_name, phone, avatar_url) on table public.profiles to authenticated;
grant update(goal, target_weight, height, birth_date, activity_level, calorie_target, protein_target, preferences) on table public.client_profiles to authenticated;

notify pgrst, 'reload schema';
commit;
