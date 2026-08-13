begin;

-- Approved versions of the coach's report.
--
-- Applied to the shared Supabase project on 2026-08-13 after a transactional
-- dry-run and schema snapshot. The report editor reads these columns directly.
--
-- What it changes, exactly:
--
--   1. weekly_summaries gains four columns, all nullable, all additive:
--        edited_went_well   text[]   the coach's edit of the three generated lists
--        edited_needs_work  text[]
--        edited_actions     text[]
--        approved_at        timestamptz
--        approved_by        uuid  -> profiles(id) on delete set null
--      Nothing existing is dropped, renamed or backfilled. A row with no edit
--      still reads exactly as it does today, because the app falls back to the
--      generated arrays when the edited ones are null.
--
--   2. A row that has been approved becomes immutable in its approved fields.
--      That is the point of a version: a coach who approved a report last month
--      must be able to show what they approved, not what the generator would say
--      about that month today. Enforced by trigger rather than by convention.
--
-- Rows affected on apply: 0. It adds columns and a trigger; it writes no data.
--
-- Rollback:
--   drop trigger if exists weekly_summaries_freeze_approved on public.weekly_summaries;
--   drop function if exists public.freeze_approved_weekly_summary();
--   alter table public.weekly_summaries
--     drop column if exists edited_went_well,
--     drop column if exists edited_needs_work,
--     drop column if exists edited_actions,
--     drop column if exists approved_at,
--     drop column if exists approved_by;

alter table public.weekly_summaries
  add column if not exists edited_went_well text[],
  add column if not exists edited_needs_work text[],
  add column if not exists edited_actions text[],
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null;

-- An approved report is a record of what the coach signed off. Once approved_at
-- is set, the text behind it stops moving - including for the generator, which
-- would otherwise quietly rewrite history on its next run.
create or replace function public.freeze_approved_weekly_summary() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.approved_at is null then return new; end if;
  if new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.edited_went_well is distinct from old.edited_went_well
     or new.edited_needs_work is distinct from old.edited_needs_work
     or new.edited_actions is distinct from old.edited_actions
     or new.went_well is distinct from old.went_well
     or new.needs_work is distinct from old.needs_work
     or new.actions is distinct from old.actions then
    raise exception 'approved_summary_is_immutable';
  end if;
  return new;
end $$;

drop trigger if exists weekly_summaries_freeze_approved on public.weekly_summaries;
create trigger weekly_summaries_freeze_approved
  before update on public.weekly_summaries
  for each row execute function public.freeze_approved_weekly_summary();

commit;
