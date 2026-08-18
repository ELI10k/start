-- A client can train on more than one programme at a time.
--
-- Until now the schema enforced exactly one active assignment per client, and
-- assign_workout_program silently completed whatever was already running. A
-- coach who wanted a second programme alongside the first had no way to say so:
-- the only answer the product could give was "replace".
--
-- What changes: the one-active-per-client unique index becomes one-active-per
-- (client, programme), so the same programme still cannot be assigned twice, and
-- assign_workout_program takes p_replace_active. Passing true keeps the old
-- behaviour; false leaves the running assignments alone.

begin;

drop index if exists public.workout_assignments_one_active_per_client;
create unique index if not exists workout_assignments_one_active_per_program
  on public.workout_assignments(client_id, program_id) where status = 'active';

drop function if exists public.assign_workout_program(text, uuid, date, date, smallint, text);

create or replace function public.assign_workout_program(
  p_program_id text,
  p_client_id uuid,
  p_start_date date,
  p_end_date date,
  p_weekly_frequency smallint,
  p_coach_note text,
  p_replace_active boolean default true
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'coach' or not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
  if p_weekly_frequency not between 1 and 7 or (p_end_date is not null and p_end_date < p_start_date) then raise exception 'invalid_assignment'; end if;
  if not exists(select 1 from public.workout_programs where id=p_program_id and status='active') then raise exception 'program_not_available'; end if;
  if coalesce(p_replace_active, true) then
    update public.workout_assignments set status='completed' where client_id=p_client_id and status='active';
  end if;
  insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,end_date,weekly_frequency,coach_note)
  values(p_client_id,p_program_id,auth.uid(),p_start_date,p_end_date,p_weekly_frequency,nullif(trim(p_coach_note),'')) returning id into v_id;
  insert into public.workout_notifications(id,client_id,type) values('notification-'||v_id::text,p_client_id,'assignment');
  return v_id;
end $$;

-- Resuming a paused assignment used to complete every other active one, which
-- is the same single-programme assumption from the other direction.
create or replace function public.set_workout_assignment_status(p_assignment_id uuid, p_status public.workout_assignment_status)
returns void language plpgsql security definer set search_path=public as $$
declare v_client_id uuid;
begin
  select client_id into v_client_id from public.workout_assignments where id=p_assignment_id;
  if v_client_id is null or public.current_role()<>'coach' or not public.is_coach_for(v_client_id) then raise exception 'not_authorized'; end if;
  update public.workout_assignments set status=p_status where id=p_assignment_id;
  if p_status<>'active' then update public.workout_sessions set status='cancelled' where assignment_id=p_assignment_id and status='active'; end if;
end $$;

revoke all on function public.assign_workout_program(text,uuid,date,date,smallint,text,boolean) from public;
grant execute on function public.assign_workout_program(text,uuid,date,date,smallint,text,boolean) to authenticated;

commit;
