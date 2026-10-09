begin;

drop policy if exists coach_workout_reviews_own_insert
  on public.coach_workout_reviews;

create policy coach_workout_reviews_own_insert
  on public.coach_workout_reviews for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.current_role() = 'coach'
    and exists (
      select 1 from public.workout_sessions s
      where s.completion_id = workout_session_id
        and s.status = 'completed'
        and public.is_coach_for(s.client_id)
    )
  );

commit;

