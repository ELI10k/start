-- A completed workout stays in the client's history, while each coach can clear
-- it independently from their dashboard work queue after reviewing it.
create table if not exists public.coach_workout_reviews (
  workout_session_id text not null references public.workout_sessions(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  handled_at timestamptz not null default now(),
  primary key (workout_session_id, coach_id)
);

create index if not exists coach_workout_reviews_coach_handled_idx
  on public.coach_workout_reviews(coach_id, handled_at desc);

alter table public.coach_workout_reviews enable row level security;

create policy coach_workout_reviews_own_read
  on public.coach_workout_reviews for select to authenticated
  using (coach_id = (select auth.uid()) and public.current_role() = 'coach');

create policy coach_workout_reviews_own_insert
  on public.coach_workout_reviews for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.current_role() = 'coach'
    and exists (
      select 1 from public.workout_sessions s
      where s.id = workout_session_id
        and s.status = 'completed'
        and public.is_coach_for(s.client_id)
    )
  );

revoke all on table public.coach_workout_reviews from anon, authenticated;
grant select, insert on table public.coach_workout_reviews to authenticated;

