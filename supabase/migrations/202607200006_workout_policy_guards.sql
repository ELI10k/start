begin;

create or replace function public.can_read_workout_program(p_program_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.workout_programs p
    where p.id=p_program_id and (
      p.official
      or (public.current_role()='coach' and p.coach_id=auth.uid())
      or exists(select 1 from public.workout_assignments a where a.program_id=p.id and a.client_id=auth.uid() and a.status<>'archived')
    )
  )
$$;
revoke all on function public.can_read_workout_program(text) from public;
grant execute on function public.can_read_workout_program(text) to authenticated;

drop policy workout_programs_authenticated_read on public.workout_programs;
create policy workout_programs_role_read on public.workout_programs for select to authenticated using (public.can_read_workout_program(id));
drop policy workout_days_authenticated_read on public.workout_program_days;
create policy workout_days_role_read on public.workout_program_days for select to authenticated using (public.can_read_workout_program(program_id));
drop policy workout_program_exercises_authenticated_read on public.workout_program_exercises;
create policy workout_program_exercises_role_read on public.workout_program_exercises for select to authenticated using (exists(select 1 from public.workout_program_days d where d.id=day_id and public.can_read_workout_program(d.program_id)));
drop policy workout_prescriptions_authenticated_read on public.workout_set_prescriptions;
create policy workout_prescriptions_role_read on public.workout_set_prescriptions for select to authenticated using (exists(select 1 from public.workout_program_exercises e join public.workout_program_days d on d.id=e.day_id where e.id=program_exercise_id and public.can_read_workout_program(d.program_id)));

create or replace function public.validate_workout_assignment_write() returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null and (new.assigned_by<>auth.uid() or public.current_role()<>'coach' or not public.is_coach_for(new.client_id) or not exists(select 1 from public.workout_programs p where p.id=new.program_id and (p.official or p.coach_id=auth.uid()))) then
    raise exception 'invalid_workout_assignment';
  end if;
  return new;
end $$;
create trigger workout_assignments_validate before insert or update on public.workout_assignments for each row execute function public.validate_workout_assignment_write();

create or replace function public.validate_workout_session_exercise() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(
    select 1 from public.workout_sessions s join public.workout_program_exercises e on e.day_id=s.day_id
    where s.id=new.session_id and e.id=new.workout_exercise_id and e.exercise_id=new.exercise_id
  ) then raise exception 'workout_exercise_not_in_session_day'; end if;
  return new;
end $$;
create trigger workout_session_exercises_validate before insert or update on public.workout_session_exercises for each row execute function public.validate_workout_session_exercise();

create or replace function public.validate_workout_coach_note() returns trigger language plpgsql set search_path=public as $$
begin
  if new.session_id is not null and not exists(select 1 from public.workout_sessions s where s.id=new.session_id and s.client_id=new.client_id) then raise exception 'workout_note_session_client_mismatch'; end if;
  return new;
end $$;
create trigger workout_coach_notes_validate before insert or update on public.workout_coach_notes for each row execute function public.validate_workout_coach_note();

commit;
