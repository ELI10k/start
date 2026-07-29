begin;

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create type public.user_role as enum ('coach', 'client');
create type public.profile_status as enum ('active', 'paused', 'disabled');
create type public.relationship_status as enum ('active', 'ended');
create type public.menu_status as enum ('draft', 'published', 'active', 'archived');
create type public.completion_status as enum ('completed', 'undone');
create type public.check_in_status as enum ('submitted', 'reviewed');
create type public.content_type as enum ('article', 'video');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (length(trim(full_name)) >= 2),
  phone text,
  role public.user_role not null,
  avatar_url text,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_unique on public.profiles(lower(email));
create index profiles_role_status_idx on public.profiles(role, status);

create table public.coach_client_relationships (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status public.relationship_status not null default 'active',
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  check (coach_id <> client_id),
  check (end_date is null or end_date >= start_date)
);
create index relationships_client_status_idx on public.coach_client_relationships(client_id, status);

create table public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goal text,
  target_weight numeric(6,2) check (target_weight is null or target_weight > 0),
  height numeric(6,2) check (height is null or height > 0),
  birth_date date check (birth_date is null or birth_date < current_date),
  activity_level text,
  calorie_target numeric(8,2) check (calorie_target is null or calorie_target > 0),
  protein_target numeric(8,2) check (protein_target is null or protein_target > 0),
  preferences jsonb not null default '{}'::jsonb,
  notes text
);

create table public.foods (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  brand text,
  category text not null check (length(trim(category)) > 0),
  calories numeric(10,3) not null check (calories >= 0),
  protein numeric(10,3) check (protein is null or protein >= 0),
  carbs numeric(10,3) check (carbs is null or carbs >= 0),
  fat numeric(10,3) check (fat is null or fat >= 0),
  sugars numeric(10,3) check (sugars is null or sugars >= 0),
  sodium_mg numeric(12,3) check (sodium_mg is null or sodium_mg >= 0),
  calcium_mg numeric(12,3) check (calcium_mg is null or calcium_mg >= 0),
  package_quantity numeric(12,3) check (package_quantity is null or package_quantity >= 0),
  package_unit text,
  barcode text,
  serving_label text not null,
  verification_status text,
  notes text,
  source_url text,
  unit_weight_grams numeric(12,3) check (unit_weight_grams is null or unit_weight_grams > 0),
  calories_per_unit numeric(10,3) check (calories_per_unit is null or calories_per_unit >= 0),
  units_per_package numeric(12,3) check (units_per_package is null or units_per_package > 0),
  search_text text generated always as (lower(coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(category, '') || ' ' || coalesce(barcode, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_category_idx on public.foods(category);
create index foods_search_trgm_idx on public.foods using gin (search_text gin_trgm_ops);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete restrict,
  client_id uuid references public.profiles(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  status public.menu_status not null default 'draft',
  calorie_target numeric(8,2) check (calorie_target is null or calorie_target > 0),
  protein_target numeric(8,2) check (protein_target is null or protein_target > 0),
  carbohydrate_target numeric(8,2) check (carbohydrate_target is null or carbohydrate_target > 0),
  fat_target numeric(8,2) check (fat_target is null or fat_target > 0),
  active_from date,
  active_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_until is null or active_from is null or active_until >= active_from)
);
create index menus_coach_idx on public.menus(coach_id, status);
create index menus_client_idx on public.menus(client_id, status);
create unique index menus_one_active_per_client on public.menus(client_id) where status = 'active' and client_id is not null;

create table public.menu_days (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  day_index smallint not null check (day_index between 0 and 6),
  title text,
  sort_order smallint not null default 0,
  unique(menu_id, day_index)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  menu_day_id uuid not null references public.menu_days(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  notes text,
  sort_order smallint not null default 0
);
create index meals_day_order_idx on public.meals(menu_day_id, sort_order);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id text not null references public.foods(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  measurement_unit text not null default 'g' check (measurement_unit in ('g')),
  calculated_calories numeric(10,2) not null check (calculated_calories >= 0),
  calculated_protein numeric(10,2) not null check (calculated_protein >= 0),
  calculated_carbohydrates numeric(10,2) not null check (calculated_carbohydrates >= 0),
  calculated_fat numeric(10,2) not null check (calculated_fat >= 0),
  sort_order smallint not null default 0
);
create index meal_items_meal_order_idx on public.meal_items(meal_id, sort_order);

create table public.meal_completion_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  completion_date date not null default current_date,
  completed_at timestamptz,
  status public.completion_status not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, meal_id, completion_date)
);
create index completion_client_date_idx on public.meal_completion_logs(client_id, completion_date);

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  weight numeric(6,2) not null check (weight > 0),
  waist numeric(6,2) check (waist is null or waist > 0),
  chest numeric(6,2) check (chest is null or chest > 0),
  hips numeric(6,2) check (hips is null or hips > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(client_id, date)
);
create index progress_client_date_idx on public.progress_entries(client_id, date desc);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  adherence smallint not null check (adherence between 1 and 5),
  hunger smallint not null check (hunger between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  sleep smallint not null check (sleep between 1 and 5),
  training boolean not null default false,
  notes text,
  coach_response text,
  status public.check_in_status not null default 'submitted',
  created_at timestamptz not null default now()
);
create index check_ins_client_submitted_idx on public.check_ins(client_id, submitted_at desc);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  category text not null,
  content_type public.content_type not null,
  thumbnail_url text,
  body text,
  media_url text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or media_url is not null or published = false)
);
create index content_published_order_idx on public.content_items(published, category, sort_order);

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null check (length(device_id) >= 16),
  device_name text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, device_id)
);
create index device_active_user_idx on public.device_sessions(user_id, revoked_at);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger foods_touch before update on public.foods for each row execute function public.touch_updated_at();
create trigger menus_touch before update on public.menus for each row execute function public.touch_updated_at();
create trigger completions_touch before update on public.meal_completion_logs for each row execute function public.touch_updated_at();
create trigger content_touch before update on public.content_items for each row execute function public.touch_updated_at();

create or replace function public.is_coach_for(target_client uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.coach_client_relationships r where r.coach_id = auth.uid() and r.client_id = target_client and r.status = 'active')
$$;
create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.coach_client_relationships enable row level security;
alter table public.client_profiles enable row level security;
alter table public.foods enable row level security;
alter table public.menus enable row level security;
alter table public.menu_days enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_completion_logs enable row level security;
alter table public.progress_entries enable row level security;
alter table public.check_ins enable row level security;
alter table public.content_items enable row level security;
alter table public.device_sessions enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_assigned_select on public.profiles for select using (public.current_role() = 'coach' and public.is_coach_for(id));
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy relationships_participant_select on public.coach_client_relationships for select using (coach_id = auth.uid() or client_id = auth.uid());
create policy client_profiles_self on public.client_profiles for select using (user_id = auth.uid());
create policy client_profiles_coach on public.client_profiles for select using (public.is_coach_for(user_id));
create policy client_profiles_self_update on public.client_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy foods_authenticated_read on public.foods for select to authenticated using (true);
create policy menus_coach_all on public.menus for all using (coach_id = auth.uid()) with check (coach_id = auth.uid() and (client_id is null or public.is_coach_for(client_id)));
create policy menus_client_select on public.menus for select using (client_id = auth.uid() and status = 'active');
create policy menu_days_visible on public.menu_days for select using (exists(select 1 from public.menus m where m.id = menu_id and (m.coach_id = auth.uid() or (m.client_id = auth.uid() and m.status = 'active'))));
create policy menu_days_coach_write on public.menu_days for all using (exists(select 1 from public.menus m where m.id = menu_id and m.coach_id = auth.uid())) with check (exists(select 1 from public.menus m where m.id = menu_id and m.coach_id = auth.uid()));
create policy meals_visible on public.meals for select using (exists(select 1 from public.menu_days d join public.menus m on m.id = d.menu_id where d.id = menu_day_id and (m.coach_id = auth.uid() or (m.client_id = auth.uid() and m.status = 'active'))));
create policy meals_coach_write on public.meals for all using (exists(select 1 from public.menu_days d join public.menus m on m.id = d.menu_id where d.id = menu_day_id and m.coach_id = auth.uid())) with check (exists(select 1 from public.menu_days d join public.menus m on m.id = d.menu_id where d.id = menu_day_id and m.coach_id = auth.uid()));
create policy meal_items_visible on public.meal_items for select using (exists(select 1 from public.meals x join public.menu_days d on d.id = x.menu_day_id join public.menus m on m.id = d.menu_id where x.id = meal_id and (m.coach_id = auth.uid() or (m.client_id = auth.uid() and m.status = 'active'))));
create policy meal_items_coach_write on public.meal_items for all using (exists(select 1 from public.meals x join public.menu_days d on d.id = x.menu_day_id join public.menus m on m.id = d.menu_id where x.id = meal_id and m.coach_id = auth.uid())) with check (exists(select 1 from public.meals x join public.menu_days d on d.id = x.menu_day_id join public.menus m on m.id = d.menu_id where x.id = meal_id and m.coach_id = auth.uid()));
create policy completions_self_all on public.meal_completion_logs for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy completions_coach_select on public.meal_completion_logs for select using (public.is_coach_for(client_id));
create policy progress_self_all on public.progress_entries for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy progress_coach_select on public.progress_entries for select using (public.is_coach_for(client_id));
create policy check_ins_self_insert_select on public.check_ins for select using (client_id = auth.uid());
create policy check_ins_self_insert on public.check_ins for insert with check (client_id = auth.uid() and coach_response is null and status = 'submitted');
create policy check_ins_coach_select on public.check_ins for select using (public.is_coach_for(client_id));
create policy check_ins_coach_update on public.check_ins for update using (public.is_coach_for(client_id)) with check (public.is_coach_for(client_id));
create policy content_published_read on public.content_items for select to authenticated using (published = true);
create policy devices_self_select on public.device_sessions for select using (user_id = auth.uid());

create or replace function public.activate_current_device(p_device_id text, p_device_name text)
returns public.device_sessions language plpgsql security definer set search_path = public as $$
declare result public.device_sessions; user_role public.user_role;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select role into user_role from public.profiles where id = auth.uid();
  if user_role = 'client' then update public.device_sessions set revoked_at = now() where user_id = auth.uid() and revoked_at is null and device_id <> p_device_id; end if;
  insert into public.device_sessions(user_id, device_id, device_name, last_seen_at, revoked_at)
  values(auth.uid(), p_device_id, left(trim(p_device_name), 120), now(), null)
  on conflict(user_id, device_id) do update set device_name = excluded.device_name, last_seen_at = now(), revoked_at = null
  returning * into result;
  return result;
end $$;

create or replace function public.reset_client_device(p_client_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
  update public.device_sessions set revoked_at = now() where user_id = p_client_id and revoked_at is null;
end $$;

revoke all on function public.activate_current_device(text,text) from public;
grant execute on function public.activate_current_device(text,text) to authenticated;
revoke all on function public.reset_client_device(uuid) from public;
grant execute on function public.reset_client_device(uuid) to authenticated;

commit;
