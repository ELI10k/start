begin;

-- Dashboard workout rows use the public completion id. The original foreign
-- key pointed at the internal session id, so every "handled" insert failed.
alter table public.coach_workout_reviews
  drop constraint if exists coach_workout_reviews_workout_session_id_fkey;
alter table public.coach_workout_reviews
  add constraint coach_workout_reviews_workout_completion_id_fkey
  foreign key (workout_session_id)
  references public.workout_sessions(completion_id)
  on delete cascade;

-- Nutrition activity is grouped by client and day on the dashboard. Each coach
-- clears their own queue independently without changing the client's log.
create table if not exists public.coach_nutrition_reviews (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  handled_at timestamptz not null default now(),
  primary key (coach_id, client_id, activity_date)
);

create index if not exists coach_nutrition_reviews_coach_handled_idx
  on public.coach_nutrition_reviews(coach_id, handled_at desc);

alter table public.coach_nutrition_reviews enable row level security;

create policy coach_nutrition_reviews_own_read
  on public.coach_nutrition_reviews for select to authenticated
  using (coach_id = (select auth.uid()) and public.current_role() = 'coach');

create policy coach_nutrition_reviews_own_insert
  on public.coach_nutrition_reviews for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.current_role() = 'coach'
    and public.is_coach_for(client_id)
  );

revoke all on table public.coach_nutrition_reviews from anon, authenticated;
grant select, insert on table public.coach_nutrition_reviews to authenticated;

commit;
