begin;

drop policy if exists notifications_coach_assigned_select on public.notifications;

drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read
  on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update
  on public.notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

notify pgrst, 'reload schema';
commit;
