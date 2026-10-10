begin;

alter table public.workout_program_days add column if not exists retired_at timestamptz;
alter table public.workout_program_exercises add column if not exists retired_at timestamptz;
alter table public.workout_program_days drop constraint if exists workout_program_days_order_key;
alter table public.workout_program_exercises drop constraint if exists workout_program_exercises_order_key;
create unique index if not exists workout_program_days_active_order_key on public.workout_program_days(program_id, sort_order) where retired_at is null;
create unique index if not exists workout_program_exercises_active_order_key on public.workout_program_exercises(day_id, sort_order) where retired_at is null;
create index if not exists workout_program_days_active_program_idx on public.workout_program_days(program_id) where retired_at is null;
create index if not exists workout_program_exercises_active_day_idx on public.workout_program_exercises(day_id) where retired_at is null;

create or replace function public.save_workout_program_tree(p_program jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare
  v_id text := nullif(p_program->>'id',''); v_day jsonb; v_entry jsonb; v_set jsonb;
  v_exists boolean; v_official boolean; v_coach uuid;
  v_days text[] := '{}'; v_entries text[] := '{}'; v_sets text[] := '{}';
begin
  if public.current_role() <> 'coach' or v_id is null then raise exception 'not_authorized'; end if;
  select p.official, p.coach_id into v_official, v_coach from public.workout_programs p where p.id = v_id;
  v_exists := found;
  if v_exists then
    if not v_official and v_coach is distinct from auth.uid() then raise exception 'program_not_owned'; end if;
  else
    v_official := false; v_coach := auth.uid();
  end if;

  insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,source_sheet,status,official,duplicated_from_id)
  values(v_id,v_coach,trim(p_program->>'name'),nullif(p_program->>'description',''),nullif(p_program->>'programType',''),nullif(p_program->>'difficulty',''),nullif(p_program->>'trainingFrequency','')::smallint,array(select jsonb_array_elements_text(coalesce(p_program->'equipment','[]'::jsonb))),coalesce(p_program->>'sourceWorkbook',''),nullif(p_program->>'sourceSheet',''),coalesce(nullif(p_program->>'status','')::public.workout_program_status,'active'),v_official,nullif(p_program->>'duplicatedFromId',''))
  on conflict(id) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,difficulty=excluded.difficulty,training_frequency=excluded.training_frequency,equipment=excluded.equipment,source_workbook=excluded.source_workbook,source_sheet=excluded.source_sheet,status=excluded.status;

  update public.workout_program_days d set sort_order = -d.sort_order - 1 where d.program_id = v_id and d.retired_at is null;
  update public.workout_program_exercises e set sort_order = -e.sort_order - 1 from public.workout_program_days d where e.day_id = d.id and d.program_id = v_id and e.retired_at is null;

  for v_day in select * from jsonb_array_elements(coalesce(p_program->'days','[]'::jsonb)) loop
    v_days := v_days || (v_day->>'id');
    insert into public.workout_program_days(id,program_id,name,sort_order,source_sheet,retired_at)
    values(v_day->>'id',v_id,trim(v_day->>'name'),coalesce((v_day->>'order')::smallint,0),nullif(v_day->>'sourceSheet',''),null)
    on conflict(id) do update set program_id=excluded.program_id,name=excluded.name,sort_order=excluded.sort_order,source_sheet=excluded.source_sheet,retired_at=null where public.workout_program_days.program_id = v_id;
    for v_entry in select * from jsonb_array_elements(coalesce(v_day->'exercises','[]'::jsonb)) loop
      v_entries := v_entries || (v_entry->>'id');
      insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,source_row,retired_at)
      values(v_entry->>'id',v_day->>'id',v_entry->>'exerciseId',coalesce((v_entry->>'order')::smallint,0),nullif(v_entry->>'sets',''),nullif(v_entry->>'reps',''),nullif(v_entry->>'rest',''),nullif(v_entry->>'notes',''),nullif(v_entry->>'sourceRow','')::integer,null)
      on conflict(id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,sort_order=excluded.sort_order,sets_text=excluded.sets_text,reps_text=excluded.reps_text,rest_text=excluded.rest_text,notes=excluded.notes,source_row=excluded.source_row,retired_at=null;
      for v_set in select * from jsonb_array_elements(coalesce(v_entry->'setPrescriptions','[]'::jsonb)) loop
        v_sets := v_sets || (v_set->>'id');
        insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions)
        values(v_set->>'id',v_entry->>'id',coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'repetitions',''))
        on conflict(id) do update set program_exercise_id=excluded.program_exercise_id,sort_order=excluded.sort_order,repetitions=excluded.repetitions;
      end loop;
    end loop;
  end loop;

  delete from public.workout_set_prescriptions p where p.program_exercise_id = any(v_entries) and not (p.id = any(v_sets));
  update public.workout_program_exercises e set retired_at = coalesce(e.retired_at, now()) from public.workout_program_days d
   where e.day_id = d.id and d.program_id = v_id and not (e.id = any(v_entries)) and exists(select 1 from public.workout_session_exercises se where se.workout_exercise_id = e.id);
  delete from public.workout_program_exercises e using public.workout_program_days d
   where e.day_id = d.id and d.program_id = v_id and not (e.id = any(v_entries)) and not exists(select 1 from public.workout_session_exercises se where se.workout_exercise_id = e.id);
  update public.workout_program_days d set retired_at = coalesce(d.retired_at, now())
   where d.program_id = v_id and not (d.id = any(v_days)) and (exists(select 1 from public.workout_sessions s where s.day_id = d.id) or exists(select 1 from public.workout_schedule_changes c where c.day_id = d.id));
  delete from public.workout_program_days d where d.program_id = v_id and not (d.id = any(v_days))
   and not exists(select 1 from public.workout_sessions s where s.day_id = d.id) and not exists(select 1 from public.workout_schedule_changes c where c.day_id = d.id);
  return v_id;
end $$;

revoke all on function public.save_workout_program_tree(jsonb) from public;
grant execute on function public.save_workout_program_tree(jsonb) to authenticated;
commit;

