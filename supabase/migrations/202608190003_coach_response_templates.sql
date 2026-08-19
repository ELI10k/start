-- Saved replies for check-in feedback.
--
-- Answering a check-in is the single most repeated thing a coach does: once per
-- client, every week. The response box was an empty textarea, so twenty clients
-- meant twenty near-identical paragraphs typed from scratch every week. Nothing
-- else in the product repeats at that rate.
--
-- A template is the coach's own words, saved once and inserted with a click.
-- {{שם}} is replaced with the client's first name when it is inserted, so a
-- saved reply still reads as though it were written to that person.
--
-- Impact: additive. One new table and its policies. No existing object changes.
--
-- Rollback: supabase/seeds/coach-response-templates-rollback.sql

begin;

create table if not exists public.coach_response_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 80),
  body text not null check (length(btrim(body)) between 1 and 4000),
  -- How often it has been used, so the list can put the useful ones first
  -- rather than making the coach scroll to their own favourite.
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  unique (coach_id, title)
);

create index if not exists coach_response_templates_coach_idx
  on public.coach_response_templates (coach_id, use_count desc);

alter table public.coach_response_templates enable row level security;

-- A coach's saved replies are their own. There is no shared library and no
-- cross-coach read: these are private working notes, not content.
drop policy if exists coach_response_templates_owner on public.coach_response_templates;
create policy coach_response_templates_owner on public.coach_response_templates
  for all to authenticated
  using (coach_id = (select auth.uid()) and public.current_role() = 'coach')
  with check (coach_id = (select auth.uid()) and public.current_role() = 'coach');

-- Counting a use is the one write that is not a plain insert or delete, and it
-- must not be a way to edit someone else's row - hence the ownership check here
-- as well as in the policy.
create or replace function public.record_response_template_use(p_template_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.coach_response_templates
    set use_count = use_count + 1
    where id = p_template_id and coach_id = auth.uid();
end $$;

revoke all on function public.record_response_template_use(uuid) from public;
grant execute on function public.record_response_template_use(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
