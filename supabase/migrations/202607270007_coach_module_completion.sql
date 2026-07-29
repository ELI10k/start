begin;

create table public.client_content_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unique (client_id, content_item_id)
);
create index client_content_assignments_client_idx on public.client_content_assignments(client_id, assigned_at desc);

create table public.coach_client_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_client_notes_client_idx on public.coach_client_notes(client_id, created_at desc);
create trigger coach_client_notes_touch before update on public.coach_client_notes for each row execute function public.touch_updated_at();

alter table public.client_content_assignments enable row level security;
alter table public.coach_client_notes enable row level security;

create policy client_content_assignments_client_read on public.client_content_assignments for select to authenticated using (client_id = (select auth.uid()));
create policy client_content_assignments_coach_all on public.client_content_assignments for all to authenticated
  using (public.is_coach_for(client_id)) with check (public.current_role() = 'coach' and public.is_coach_for(client_id) and assigned_by = (select auth.uid()));
create policy coach_client_notes_coach_all on public.coach_client_notes for all to authenticated
  using (coach_id = (select auth.uid()) and public.is_coach_for(client_id))
  with check (coach_id = (select auth.uid()) and public.is_coach_for(client_id));

grant select, insert, update, delete on public.client_content_assignments, public.coach_client_notes to authenticated;

create or replace function public.delete_meal_plan(p_meal_plan_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  delete from public.meal_plans where id = p_meal_plan_id and coach_id = auth.uid();
  if not found then raise exception 'meal_plan_not_found_or_not_owned'; end if;
end $$;

create or replace function public.delete_workout_program(p_program_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if exists(select 1 from public.workout_assignments where program_id = p_program_id) then
    raise exception 'program_has_assignment';
  end if;
  delete from public.workout_programs where id = p_program_id and coach_id = auth.uid() and not official;
  if not found then raise exception 'workout_program_not_found_or_not_owned'; end if;
end $$;

create or replace function public.create_coach_notification(
  p_client_id uuid, p_title text, p_body text, p_href text, p_scheduled_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'coach' or not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
  if length(trim(coalesce(p_title,''))) = 0 or length(trim(coalesce(p_title,''))) > 160 or p_href !~ '^/' then raise exception 'invalid_notification'; end if;
  insert into public.notifications(recipient_id, actor_id, category, type, title, body, href, source_table, source_id)
  values(p_client_id, auth.uid(), 'system', 'coach_message', trim(p_title), left(coalesce(p_body,''), 2000), p_href, 'coach_manual_notification', coalesce(p_scheduled_at::text, now()::text))
  returning id into v_id;
  return v_id;
end $$;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('meal_plan_assigned','workout_assigned','check_in_submitted','check_in_reviewed','progress_updated','check_in_reminder','weight_reminder','content_published','workout_morning_reminder','workout_evening_reminder','workout_snooze','workout_skipped','workout_moved','meal_reminder','end_of_day_reminder','weekly_achievement','coach_message'));

create policy notifications_coach_assigned_select on public.notifications for select to authenticated using (public.is_coach_for(recipient_id));

revoke all on function public.delete_meal_plan(uuid), public.delete_workout_program(text), public.create_coach_notification(uuid,text,text,text,timestamptz) from public;
grant execute on function public.delete_meal_plan(uuid), public.delete_workout_program(text), public.create_coach_notification(uuid,text,text,text,timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
