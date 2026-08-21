-- Writing notifications in one round trip, and not keeping them forever.
--
-- Two things in this schema are shaped for nine clients and not for a thousand.
--
-- 1. The daily-coach job reads everything it needs in six queries - that was
--    fixed on 2026-08-20 - and then sends one create_in_app_notification per
--    client, sequentially, inside a serverless function with a wall clock. The
--    queries stopped growing with the roster; the writes did not. At a few
--    hundred clients the function is cut off partway through and the clients at
--    the end of the list simply never hear from it, with no error anywhere.
--
--    create_in_app_notifications takes the whole batch as one argument. The
--    per-row behaviour is unchanged because it is the same function doing it:
--    the category preference is still consulted, the dedupe key still collapses
--    a re-run into the same row.
--
-- 2. Nothing has ever deleted a notification. The scheduler writes up to four a
--    day per client, so a thousand clients produce something like a million rows
--    a year - and on the free tier that is most of the database, spent on
--    reminders about days that are long past.
--
--    Read notifications are kept for 60 days and unread ones for 180. Unread
--    outlives read on purpose: an unread row is something the client has not
--    seen yet, and deleting it silently answers a question nobody asked.
--
-- The weekly-summary job has the same shape and the same fix: roughly thirteen
-- round trips per client, so upsert_weekly_summaries takes the batch.
--
-- Impact: three new functions and one index. No table or policy changes, and
-- neither create_in_app_notification nor upsert_weekly_summary is touched.
--
-- Rollback: supabase/seeds/notifications-at-scale-rollback.sql

begin;

-- The delete walks by age, and there was no index on created_at alone.
create index if not exists notifications_created_at_idx
  on public.notifications (created_at);

/**
 * Writes a batch of notifications in one call.
 *
 * Each element is an object with the same fields create_in_app_notification
 * takes. Anything malformed is skipped rather than failing the batch: one bad
 * row must not cost every other client their message.
 */
create or replace function public.create_in_app_notifications(p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_written integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then return 0; end if;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    begin
      perform public.create_in_app_notification(
        (v_row->>'recipient_id')::uuid,
        nullif(v_row->>'actor_id', '')::uuid,
        v_row->>'category',
        v_row->>'type',
        v_row->>'title',
        v_row->>'body',
        v_row->>'href',
        nullif(v_row->>'source_table', ''),
        nullif(v_row->>'source_id', ''),
        nullif(v_row->>'dedupe_key', '')
      );
      v_written := v_written + 1;
    exception when others then
      -- One unusable row is not a reason to drop the rest of the batch.
      continue;
    end;
  end loop;
  return v_written;
end $$;

/**
 * Removes notifications old enough that nobody is going to act on them.
 *
 * Called from the daily reminder job, which already runs and is cheap. Returns
 * how many rows went, so a run that suddenly deletes far more than usual is
 * visible in the logs rather than silent.
 */
create or replace function public.prune_notifications(
  p_read_days integer default 60, p_unread_days integer default 180
)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_removed integer;
begin
  delete from public.notifications
  where (read_at is not null and created_at < now() - make_interval(days => greatest(p_read_days, 1)))
     or (read_at is null and created_at < now() - make_interval(days => greatest(p_unread_days, 1)));
  get diagnostics v_removed = row_count;
  return v_removed;
end $$;

/**
 * Writes a batch of weekly summaries in one call.
 *
 * Same reason as the notifications above: the weekly job ran roughly thirteen
 * round trips per client inside one serverless function, so it was cut off long
 * before a thousand clients - and a coach whose clients sit at the end of the
 * alphabet would find their reports simply missing.
 *
 * upsert_weekly_summary still does the work, so the rule it enforces - that a
 * summary the coach has already sent is never overwritten - is unchanged.
 */
create or replace function public.upsert_weekly_summaries(p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_written integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then return 0; end if;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    begin
      perform public.upsert_weekly_summary(
        (v_row->>'client_id')::uuid,
        (v_row->>'week_start')::date,
        v_row->>'status',
        v_row->>'provider',
        coalesce(v_row->'facts', '{}'::jsonb),
        coalesce(array(select jsonb_array_elements_text(v_row->'went_well')), '{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(v_row->'needs_work')), '{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(v_row->'actions')), '{}'::text[])
      );
      v_written := v_written + 1;
    exception when others then
      -- One client's bad week must not cost every other client their summary.
      continue;
    end;
  end loop;
  return v_written;
end $$;

revoke all on function public.upsert_weekly_summaries(jsonb) from public, anon;
revoke all on function public.create_in_app_notifications(jsonb) from public, anon;
revoke all on function public.prune_notifications(integer, integer) from public, anon;
-- Both are service-role work: one is the batch writer the cron uses, the other
-- deletes rows. Neither is something a signed-in person should be able to call.

notify pgrst, 'reload schema';
commit;
