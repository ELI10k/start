begin;

create policy notifications_coach_message_history_select
  on public.notifications
  for select
  to authenticated
  using (
    type = 'coach_message'
    and actor_id = (select auth.uid())
    and public.is_coach_for(recipient_id)
  );

notify pgrst, 'reload schema';
commit;
