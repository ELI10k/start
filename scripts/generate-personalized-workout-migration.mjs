// Generates an additive, rerunnable catalogue migration. Existing programmes,
// assignments and historical prescriptions are never overwritten.
import { writeFile } from "node:fs/promises";
import { BUILT_IN_PROGRAMS } from "../lib/workouts/program-catalog.ts";
import { readFile } from "node:fs/promises";
const output = new URL(process.argv[2] ?? "../supabase/migrations/20261004143008_expanded_workout_catalog.sql", import.meta.url);
const exercises = JSON.parse(await readFile(new URL("../data/personalized-workout-exercises.json", import.meta.url), "utf8"));
const expanded=output.pathname.includes("expanded_workout_catalog");
const programmes=expanded?BUILT_IN_PROGRAMS.slice(21):BUILT_IN_PROGRAMS;
const referenced=new Set(programmes.flatMap(p=>p.days.flatMap(d=>d.exercises.map(e=>e.exerciseId))));
const selectedExercises=exercises.filter(e=>referenced.has(e.id));
const quote = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const sql = `begin;
do $catalog$
declare e jsonb; p jsonb; d jsonb; x jsonb; s jsonb;
begin
 for e in select * from jsonb_array_elements(${quote(selectedExercises)}) loop
  insert into public.workout_exercises(id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,equipment,difficulty,video,execution_notes,image_url,how_to,cues,common_mistakes,source_workbooks,source_references,status)
  values(e->>'id',e->>'name',e->>'normalized_name',array(select jsonb_array_elements_text(e->'aliases')),e->>'category',e->>'primary_muscle_group',array(select jsonb_array_elements_text(e->'secondary_muscle_groups')),e->>'equipment',e->>'difficulty',e->'video',e->>'execution_notes',e->>'image_url',e->>'how_to',array(select jsonb_array_elements_text(e->'cues')),array(select jsonb_array_elements_text(e->'common_mistakes')),array(select jsonb_array_elements_text(e->'source_workbooks')),e->'source_references','active') on conflict(id) do nothing;
 end loop;
 for p in select * from jsonb_array_elements(${quote(programmes)}) loop
  if exists(select 1 from public.workout_programs where id=p->>'id') then continue; end if;
  insert into public.workout_programs(id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,status,official)
  values(p->>'id',p->>'name',p->>'description',p->>'programType',p->>'difficulty',(p->>'trainingFrequency')::smallint,array(select jsonb_array_elements_text(p->'equipment')),p->>'sourceWorkbook','active',true);
  for d in select * from jsonb_array_elements(p->'days') loop
   insert into public.workout_program_days(id,program_id,name,sort_order) values(d->>'id',p->>'id',d->>'name',(d->>'order')::smallint);
   for x in select * from jsonb_array_elements(d->'exercises') loop
    insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes)
    values(x->>'id',d->>'id',x->>'exerciseId',(x->>'order')::smallint,x->>'sets',x->>'reps',x->>'rest',concat_ws(E'\\n',case when x->>'effort' is not null then 'RPE יעד: '||(x->>'effort') end,x->>'notes'));
    for s in select * from jsonb_array_elements(coalesce(x->'setPrescriptions','[]'::jsonb)) loop
     insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions) values(s->>'id',x->>'id',(s->>'order')::smallint,s->>'repetitions');
    end loop;
   end loop;
  end loop;
 end loop;
end $catalog$;

-- Service role only. Called by authenticated, authorized server actions.
-- SECURITY INVOKER retains permissions; no new RLS bypass is introduced.
create or replace function public.assign_intake_workout(p_client_id uuid,p_coach_id uuid,p_program jsonb,p_start_date date,p_location text,p_equipment text[])
returns text language plpgsql security invoker set search_path=public as $function$
declare d jsonb; x jsonb; s jsonb; assignment_id uuid;
begin
 if not exists(select 1 from public.coach_client_relationships where client_id=p_client_id and coach_id=p_coach_id and status='active') then raise exception 'relationship_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_client_id::text,0));
 insert into public.workout_preferences(client_id,training_types,equipment,training_location,preferred_days)
 values(p_client_id,array[p_program->>'programType'],p_equipment,p_location,'{}')
 on conflict(client_id) do update set training_types=excluded.training_types,equipment=excluded.equipment,training_location=excluded.training_location;
 if exists(select 1 from public.workout_assignments where client_id=p_client_id and status='active') then return 'already_active'; end if;
 if exists(select 1 from public.workout_sessions where client_id=p_client_id and status='active') then return 'already_active'; end if;
 if not exists(select 1 from public.workout_programs where id=p_program->>'duplicatedFromId' and official and status='active') then raise exception 'template_required'; end if;
 insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,status,official,duplicated_from_id)
 values(p_program->>'id',p_coach_id,p_program->>'name',p_program->>'description',p_program->>'programType',p_program->>'difficulty',(p_program->>'trainingFrequency')::smallint,array(select jsonb_array_elements_text(p_program->'equipment')),p_program->>'sourceWorkbook','active',false,p_program->>'duplicatedFromId');
 for d in select * from jsonb_array_elements(p_program->'days') loop
  insert into public.workout_program_days(id,program_id,name,sort_order) values(d->>'id',p_program->>'id',d->>'name',(d->>'order')::smallint);
  for x in select * from jsonb_array_elements(d->'exercises') loop
   insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes)
   values(x->>'id',d->>'id',x->>'exerciseId',(x->>'order')::smallint,x->>'sets',x->>'reps',x->>'rest',x->>'notes');
   for s in select * from jsonb_array_elements(coalesce(x->'setPrescriptions','[]'::jsonb)) loop
    insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions) values(s->>'id',x->>'id',(s->>'order')::smallint,s->>'repetitions');
   end loop;
  end loop;
 end loop;
 insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,weekly_frequency,status,coach_note)
 values(p_client_id,p_program->>'id',p_coach_id,p_start_date,(p_program->>'trainingFrequency')::smallint,'active','הותאם אוטומטית לפי שאלון אפיון הלקוח; החלפות תרגילים לפי ציוד ודפוס תנועה.') returning id into assignment_id;
 return assignment_id::text;
end $function$;
revoke all on function public.assign_intake_workout(uuid,uuid,jsonb,date,text,text[]) from public,anon,authenticated;
grant execute on function public.assign_intake_workout(uuid,uuid,jsonb,date,text,text[]) to service_role;
commit;
`;
await writeFile(output, sql);
console.log(JSON.stringify({programs: programmes.length, days: programmes.flatMap(p=>p.days).length, exercises: selectedExercises.length, output: output.pathname}));
