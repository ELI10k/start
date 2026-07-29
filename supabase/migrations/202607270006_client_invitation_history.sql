begin;

create type public.client_invitation_status as enum (
  'sent',
  'opened',
  'superseded',
  'expired',
  'onboarding_completed'
);

create table public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  status public.client_invitation_status not null default 'sent',
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > sent_at),
  check (opened_at is null or opened_at >= sent_at),
  check (onboarding_completed_at is null or onboarding_completed_at >= sent_at)
);

create index client_invitations_client_sent_idx on public.client_invitations(client_id, sent_at desc);
create index client_invitations_coach_sent_idx on public.client_invitations(coach_id, sent_at desc);

alter table public.client_invitations enable row level security;
revoke all on public.client_invitations from anon, authenticated;
grant select on public.client_invitations to authenticated;

create policy client_invitations_coach_read on public.client_invitations
  for select using (public.is_coach_for(client_id));
create policy client_invitations_client_read on public.client_invitations
  for select using (client_id = auth.uid());

create view public.client_invitation_statuses with (security_invoker = true) as
  select
    *,
    case
      when status in ('sent', 'opened') and expires_at <= now() then 'expired'::public.client_invitation_status
      else status
    end as effective_status
  from public.client_invitations;

grant select on public.client_invitation_statuses to authenticated;

notify pgrst, 'reload schema';
commit;
