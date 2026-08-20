-- Rollback for 202608190001_coach_client_messages.sql.
--
-- Drops the direct channel and returns notifications.type to the list it
-- accepted before. Run the delete first: any direct_message notification still
-- in the table would fail the narrowed constraint.

begin;

drop function if exists public.unread_message_count();
drop function if exists public.mark_message_thread_read(uuid);
drop function if exists public.send_coach_client_message(text, text, uuid);

drop table if exists public.coach_client_messages;

delete from public.notifications where type = 'direct_message';

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'meal_plan_assigned','workout_assigned','check_in_submitted','check_in_reviewed',
  'progress_updated','check_in_reminder','weight_reminder','content_published',
  'workout_morning_reminder','workout_evening_reminder','workout_snooze',
  'workout_skipped','workout_moved','meal_reminder','end_of_day_reminder',
  'weekly_achievement','coach_message'));

notify pgrst, 'reload schema';
commit;
