begin;

create table if not exists public.meal_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  photo_date date not null,
  storage_path text not null check (length(trim(storage_path)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, meal_id, photo_date),
  check (split_part(storage_path, '/', 1) = client_id::text)
);

create index if not exists meal_photos_client_date_idx
  on public.meal_photos(client_id, photo_date);

drop trigger if exists meal_photos_touch on public.meal_photos;
create trigger meal_photos_touch before update on public.meal_photos
for each row execute function public.touch_updated_at();

alter table public.meal_photos enable row level security;
drop policy if exists meal_photos_client_all on public.meal_photos;
create policy meal_photos_client_all on public.meal_photos
for all to authenticated
using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

drop policy if exists meal_photos_coach_read on public.meal_photos;
create policy meal_photos_coach_read on public.meal_photos
for select to authenticated using (public.is_coach_for(client_id));

grant select, insert, update, delete on public.meal_photos to authenticated;
notify pgrst, 'reload schema';

commit;
