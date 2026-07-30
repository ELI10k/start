begin;

create table if not exists public.app_health (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.app_health enable row level security;

revoke all on table public.app_health from anon, authenticated;
grant select on table public.app_health to anon, authenticated;

drop policy if exists "app_health_public_read" on public.app_health;
create policy "app_health_public_read"
on public.app_health
for select
to anon, authenticated
using (true);

insert into public.app_health (status)
select 'connected'
where not exists (
  select 1 from public.app_health where status = 'connected'
);

commit;
