-- One weekly summary per client per week, generated on Saturday evening from
-- data the client actually produced.
--
-- The facts the summary was written from are stored alongside the text. That is
-- deliberate: a coach reading "ארבעה אימונים מתוך ארבעה" can see the four rows
-- that claim came from, and a summary can never drift from the week it
-- describes. It is also the only way to tell a wrong summary from a wrong number.
--
-- Rollback: drop function public.upsert_weekly_summary(uuid,date,text,text,jsonb,text[],text[],text[]);
--           drop function public.mark_weekly_summary_sent(uuid);
--           drop table public.weekly_summaries;

begin;

create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  -- The Sunday that opens the week, in Asia/Jerusalem.
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'insufficient_data')),
  -- Which writer produced the text: the deterministic composer, or a model.
  provider text not null default 'rules' check (length(trim(provider)) between 1 and 40),
  facts jsonb not null default '{}'::jsonb,
  went_well text[] not null default '{}',
  needs_work text[] not null default '{}',
  actions text[] not null default '{}',
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (client_id, week_start)
);
create index if not exists weekly_summaries_client_week_idx on public.weekly_summaries(client_id, week_start desc);

alter table public.weekly_summaries enable row level security;

-- A client sees a summary once it has been sent. A draft is the coach's until
-- then, so a half-written week never appears on the client's screen.
drop policy if exists weekly_summaries_client_read on public.weekly_summaries;
create policy weekly_summaries_client_read on public.weekly_summaries
  for select to authenticated
  using (client_id = (select auth.uid()) and status = 'sent');

drop policy if exists weekly_summaries_coach_read on public.weekly_summaries;
create policy weekly_summaries_coach_read on public.weekly_summaries
  for select to authenticated
  using (public.is_coach_for(client_id));

-- Written by the scheduled generator, which runs as the service role. No
-- authenticated grant: a summary is evidence, and a client editing their own
-- would make it worthless.
create or replace function public.upsert_weekly_summary(
  p_client_id uuid,
  p_week_start date,
  p_status text,
  p_provider text,
  p_facts jsonb,
  p_went_well text[],
  p_needs_work text[],
  p_actions text[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_status not in ('draft','sent','insufficient_data') then raise exception 'invalid_status'; end if;
  if p_client_id is null or p_week_start is null then raise exception 'invalid_summary'; end if;

  insert into public.weekly_summaries(client_id, week_start, status, provider, facts, went_well, needs_work, actions, generated_at)
  values (p_client_id, p_week_start, p_status, coalesce(nullif(trim(p_provider),''),'rules'), coalesce(p_facts,'{}'::jsonb),
          coalesce(p_went_well,'{}'), coalesce(p_needs_work,'{}'), coalesce(p_actions,'{}'), now())
  on conflict (client_id, week_start) do update
    set status = excluded.status, provider = excluded.provider, facts = excluded.facts,
        went_well = excluded.went_well, needs_work = excluded.needs_work, actions = excluded.actions,
        generated_at = now()
    -- A summary already delivered is not rewritten underneath the client.
    where public.weekly_summaries.status <> 'sent'
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.mark_weekly_summary_sent(p_summary_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_client uuid;
begin
  select client_id into v_client from public.weekly_summaries where id = p_summary_id;
  if v_client is null then raise exception 'summary_not_found'; end if;
  -- The coach decides when their client sees it.
  if public.current_role() <> 'coach' or not public.is_coach_for(v_client) then raise exception 'not_authorized'; end if;
  update public.weekly_summaries set status = 'sent', sent_at = now()
  where id = p_summary_id and status = 'draft';
end $$;

revoke all on table public.weekly_summaries from anon, authenticated;
grant select on table public.weekly_summaries to authenticated;
revoke all on function public.upsert_weekly_summary(uuid,date,text,text,jsonb,text[],text[],text[]) from public, authenticated;
revoke all on function public.mark_weekly_summary_sent(uuid) from public;
grant execute on function public.mark_weekly_summary_sent(uuid) to authenticated;

commit;
