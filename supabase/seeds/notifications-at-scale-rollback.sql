-- Undoes 202608210007. The cron falls back to one write per client, and
-- notifications accumulate without limit again. Nothing already deleted comes
-- back; nothing still stored changes.

begin;

drop function if exists public.create_in_app_notifications(jsonb);
drop function if exists public.upsert_weekly_summaries(jsonb);
drop function if exists public.prune_notifications(integer, integer);
drop index if exists public.notifications_created_at_idx;

notify pgrst, 'reload schema';
commit;
