begin;

-- A coach could not change a single rep of an approved programme. Three separate
-- things stopped them, and only the first was a permission:
--
--   1. save_workout_program_tree raised not_authorized for any payload carrying
--      official=true.
--   2. its upsert was filtered `where not official and coach_id=auth.uid()`, and
--      the seeded programmes have coach_id null - so even without (1) the update
--      matched no row and the function raised program_not_owned.
--   3. it emptied the tree - `delete from workout_program_days where program_id=…`
--      - before re-inserting it. workout_sessions.day_id and
--      workout_session_exercises.workout_exercise_id reference those rows ON
--      DELETE RESTRICT, so on any programme a client had ever trained, Postgres
--      refused the delete and the whole save failed. That was never specific to
--      the approved programmes: a coach's own programme became unsavable the
--      moment the first client finished a workout on it.
--
-- (3) is also why this migration has to start with the history rather than with
-- the permission. A completed workout keeps every number the client performed -
-- weight, reps, volume, duration are columns on workout_sets and
-- workout_sessions - but the prescription it was performed under, and the name of
-- the day, were read live from the programme. Editing the programme would have
-- retitled past workouts. So the snapshot comes first, the destructive save goes
-- second, and only then is the permission opened.

-- ---------------------------------------------------------------- 1. history

alter table public.workout_sessions add column if not exists day_name text;
alter table public.workout_session_exercises
  add column if not exists prescribed_sets text,
  add column if not exists prescribed_reps text,
  add column if not exists prescribed_rest text,
  add column if not exists prescribed_notes text;
alter table public.workout_sets add column if not exists prescribed_repetitions text;

update public.workout_sessions s
   set day_name = d.name
  from public.workout_program_days d
 where d.id = s.day_id and s.day_name is null;

update public.workout_session_exercises se
   set prescribed_sets = e.sets_text,
       prescribed_reps = e.reps_text,
       prescribed_rest = e.rest_text,
       prescribed_notes = e.notes
  from public.workout_program_exercises e
 where e.id = se.workout_exercise_id
   and se.prescribed_sets is null and se.prescribed_reps is null
   and se.prescribed_rest is null and se.prescribed_notes is null;

update public.workout_sets ws
   set prescribed_repetitions = p.repetitions
  from public.workout_set_prescriptions p
 where p.id = ws.prescription_id and ws.prescribed_repetitions is null;

-- Taken on write, not on read. save_active_workout and complete_workout both
-- delete and re-insert the result rows, so an active session keeps tracking the
-- current plan and the final insert at completion is what freezes.
create or replace function public.snapshot_workout_session_day() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.day_name is null then
    select d.name into new.day_name from public.workout_program_days d where d.id = new.day_id;
  end if;
  return new;
end $$;
drop trigger if exists workout_sessions_snapshot_day on public.workout_sessions;
create trigger workout_sessions_snapshot_day before insert on public.workout_sessions
  for each row execute function public.snapshot_workout_session_day();

create or replace function public.snapshot_workout_prescription() returns trigger
language plpgsql set search_path=public as $$
begin
  select coalesce(new.prescribed_sets, e.sets_text), coalesce(new.prescribed_reps, e.reps_text),
         coalesce(new.prescribed_rest, e.rest_text), coalesce(new.prescribed_notes, e.notes)
    into new.prescribed_sets, new.prescribed_reps, new.prescribed_rest, new.prescribed_notes
    from public.workout_program_exercises e where e.id = new.workout_exercise_id;
  return new;
end $$;
drop trigger if exists workout_session_exercises_snapshot on public.workout_session_exercises;
create trigger workout_session_exercises_snapshot before insert on public.workout_session_exercises
  for each row execute function public.snapshot_workout_prescription();

create or replace function public.snapshot_workout_set_prescription() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.prescribed_repetitions is null and new.prescription_id is not null then
    select p.repetitions into new.prescribed_repetitions
      from public.workout_set_prescriptions p where p.id = new.prescription_id;
  end if;
  return new;
end $$;
drop trigger if exists workout_sets_snapshot_prescription on public.workout_sets;
create trigger workout_sets_snapshot_prescription before insert on public.workout_sets
  for each row execute function public.snapshot_workout_set_prescription();

-- ------------------------------------------------------------- 2. reordering

-- Reordering in place swaps two sort_orders, which collides with the uniqueness
-- of (parent, sort_order) halfway through the statement. Deferring the check to
-- commit lets the tree be rewritten in one transaction.
do $$
declare v_name text;
begin
  for v_name in
    select c.conname from pg_constraint c
     where c.conrelid = 'public.workout_program_days'::regclass and c.contype = 'u'
       and pg_get_constraintdef(c.oid) like '%sort_order%'
  loop execute format('alter table public.workout_program_days drop constraint %I', v_name); end loop;
  execute 'alter table public.workout_program_days add constraint workout_program_days_order_key unique(program_id, sort_order) deferrable initially deferred';

  for v_name in
    select c.conname from pg_constraint c
     where c.conrelid = 'public.workout_program_exercises'::regclass and c.contype = 'u'
       and pg_get_constraintdef(c.oid) like '%sort_order%'
  loop execute format('alter table public.workout_program_exercises drop constraint %I', v_name); end loop;
  execute 'alter table public.workout_program_exercises add constraint workout_program_exercises_order_key unique(day_id, sort_order) deferrable initially deferred';

  for v_name in
    select c.conname from pg_constraint c
     where c.conrelid = 'public.workout_set_prescriptions'::regclass and c.contype = 'u'
       and pg_get_constraintdef(c.oid) like '%sort_order%'
  loop execute format('alter table public.workout_set_prescriptions drop constraint %I', v_name); end loop;
  execute 'alter table public.workout_set_prescriptions add constraint workout_set_prescriptions_order_key unique(program_exercise_id, sort_order) deferrable initially deferred';
end $$;

-- ------------------------------------------------------------------ 3. save

create or replace function public.save_workout_program_tree(p_program jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare
  v_id text := nullif(p_program->>'id','');
  v_day jsonb; v_entry jsonb; v_set jsonb;
  v_exists boolean;
  v_official boolean;
  v_coach uuid;
  v_days text[] := '{}';
  v_entries text[] := '{}';
  v_sets text[] := '{}';
  v_blocked text;
begin
  -- Coach only, still. There is no admin role in this schema - public.user_role
  -- is ('coach','client') - so "coach" is the whole of the privileged side, and a
  -- client reaching this function is refused here as well as by RLS.
  if public.current_role() <> 'coach' or v_id is null then raise exception 'not_authorized'; end if;

  select p.official, p.coach_id into v_official, v_coach from public.workout_programs p where p.id = v_id;
  v_exists := found;

  if v_exists then
    -- An approved programme is the shared catalogue and belongs to no one coach
    -- (coach_id is null on the seeded rows), so any coach may edit it. A coach's
    -- own programme stays private to its owner.
    if not v_official and v_coach is distinct from auth.uid() then raise exception 'program_not_owned'; end if;
  else
    v_official := false;
    v_coach := auth.uid();
  end if;

  -- official and coach_id are deliberately absent from the update list: a save
  -- may change what a programme prescribes, never what it is or who owns it.
  insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,source_sheet,status,official,duplicated_from_id)
  values(v_id,v_coach,trim(p_program->>'name'),nullif(p_program->>'description',''),nullif(p_program->>'programType',''),nullif(p_program->>'difficulty',''),nullif(p_program->>'trainingFrequency','')::smallint,
    array(select jsonb_array_elements_text(coalesce(p_program->'equipment','[]'::jsonb))),coalesce(p_program->>'sourceWorkbook',''),nullif(p_program->>'sourceSheet',''),coalesce(nullif(p_program->>'status','')::public.workout_program_status,'active'),v_official,nullif(p_program->>'duplicatedFromId',''))
  on conflict(id) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,difficulty=excluded.difficulty,training_frequency=excluded.training_frequency,equipment=excluded.equipment,source_workbook=excluded.source_workbook,source_sheet=excluded.source_sheet,status=excluded.status;

  -- Upsert rather than empty-and-refill. The ids a completed workout points at
  -- survive the save, which is what lets a trained programme be edited at all.
  for v_day in select * from jsonb_array_elements(coalesce(p_program->'days','[]'::jsonb)) loop
    v_days := v_days || (v_day->>'id');
    insert into public.workout_program_days(id,program_id,name,sort_order,source_sheet)
    values(v_day->>'id',v_id,trim(v_day->>'name'),coalesce((v_day->>'order')::smallint,0),nullif(v_day->>'sourceSheet',''))
    on conflict(id) do update set program_id=excluded.program_id,name=excluded.name,sort_order=excluded.sort_order,source_sheet=excluded.source_sheet
    where public.workout_program_days.program_id = v_id;

    for v_entry in select * from jsonb_array_elements(coalesce(v_day->'exercises','[]'::jsonb)) loop
      v_entries := v_entries || (v_entry->>'id');
      insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,source_row)
      values(v_entry->>'id',v_day->>'id',v_entry->>'exerciseId',coalesce((v_entry->>'order')::smallint,0),nullif(v_entry->>'sets',''),nullif(v_entry->>'reps',''),nullif(v_entry->>'rest',''),nullif(v_entry->>'notes',''),nullif(v_entry->>'sourceRow','')::integer)
      on conflict(id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,sort_order=excluded.sort_order,sets_text=excluded.sets_text,reps_text=excluded.reps_text,rest_text=excluded.rest_text,notes=excluded.notes,source_row=excluded.source_row;

      for v_set in select * from jsonb_array_elements(coalesce(v_entry->'setPrescriptions','[]'::jsonb)) loop
        v_sets := v_sets || (v_set->>'id');
        insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions)
        values(v_set->>'id',v_entry->>'id',coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'repetitions',''))
        on conflict(id) do update set program_exercise_id=excluded.program_exercise_id,sort_order=excluded.sort_order,repetitions=excluded.repetitions;
      end loop;
    end loop;
  end loop;

  -- Whatever the coach removed. A dropped prescription row is harmless now that
  -- workout_sets carries prescribed_repetitions of its own.
  delete from public.workout_set_prescriptions p
   using public.workout_program_exercises e, public.workout_program_days d
   where p.program_exercise_id = e.id and e.day_id = d.id and d.program_id = v_id
     and not (p.id = any(v_sets));

  -- A slot someone has already trained is not removable: workout_session_exercises
  -- is keyed on it, and re-pointing that key would be rewriting the client's past.
  -- Replacing the exercise in the slot, or changing its prescription, both still
  -- work - so the coach is not stuck, only stopped from erasing evidence.
  select string_agg(distinct e.id, ', ') into v_blocked
    from public.workout_program_exercises e
    join public.workout_program_days d on d.id = e.day_id
   where d.program_id = v_id and not (e.id = any(v_entries))
     and exists(select 1 from public.workout_session_exercises se where se.workout_exercise_id = e.id);
  if v_blocked is not null then raise exception 'exercise_has_history' using detail = v_blocked; end if;

  delete from public.workout_program_exercises e
   using public.workout_program_days d
   where e.day_id = d.id and d.program_id = v_id and not (e.id = any(v_entries));

  select string_agg(distinct d.id, ', ') into v_blocked
    from public.workout_program_days d
   where d.program_id = v_id and not (d.id = any(v_days))
     and exists(select 1 from public.workout_sessions s where s.day_id = d.id);
  if v_blocked is not null then raise exception 'day_has_history' using detail = v_blocked; end if;

  delete from public.workout_program_days d where d.program_id = v_id and not (d.id = any(v_days));

  return v_id;
end $$;

commit;
