begin;
alter table public.check_ins
  add column if not exists weight numeric(6,2) check (weight is null or weight > 0),
  add column if not exists navel_circumference numeric(6,2) check (navel_circumference is null or navel_circumference > 0),
  add column if not exists mood smallint check (mood is null or mood between 1 and 10),
  add column if not exists workouts_completed smallint check (workouts_completed is null or workouts_completed >= 0),
  add column if not exists meal_plan_days smallint check (meal_plan_days is null or meal_plan_days between 0 and 7);
create table if not exists public.check_in_photos (id uuid primary key default gen_random_uuid(), check_in_id uuid not null references public.check_ins(id) on delete cascade, client_id uuid not null references public.profiles(id) on delete cascade, view text not null check (view in ('front','side','back')), storage_path text not null, created_at timestamptz not null default now(), unique(check_in_id,view));
alter table public.check_in_photos enable row level security;
create policy check_in_photos_client_select on public.check_in_photos for select using (client_id=auth.uid());
create policy check_in_photos_client_insert on public.check_in_photos for insert with check (client_id=auth.uid() and exists(select 1 from public.check_ins c where c.id=check_in_id and c.client_id=auth.uid()));
create policy check_in_photos_coach_select on public.check_in_photos for select using (public.is_coach_for(client_id));
notify pgrst, 'reload schema';
commit;
