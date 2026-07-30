import { readFile, writeFile } from "node:fs/promises";

const exercises = JSON.parse(await readFile(new URL("../data/exercises.json", import.meta.url), "utf8"));
const programs = JSON.parse(await readFile(new URL("../data/workouts.json", import.meta.url), "utf8"));
const output = new URL("../supabase/migrations/202607200005_workout_catalog.sql", import.meta.url);
const json = (value) => JSON.stringify(value).replaceAll("$catalog$", "$catalog_data$");

const sql = `begin;

do $migration$
declare
  v_exercises jsonb := $catalog$${json(exercises)}$catalog$::jsonb;
  v_programs jsonb := $catalog$${json(programs)}$catalog$::jsonb;
  v_exercise jsonb; v_program jsonb; v_day jsonb; v_entry jsonb; v_set jsonb;
begin
  for v_exercise in select * from jsonb_array_elements(v_exercises) loop
    insert into public.workout_exercises(id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,equipment,difficulty,video,execution_notes,source_workbooks,source_references,status)
    values(v_exercise->>'id',v_exercise->>'name',v_exercise->>'normalizedName',array(select jsonb_array_elements_text(coalesce(v_exercise->'aliases','[]'::jsonb))),nullif(v_exercise->>'category',''),nullif(v_exercise->>'primaryMuscleGroup',''),array(select jsonb_array_elements_text(coalesce(v_exercise->'secondaryMuscleGroups','[]'::jsonb))),nullif(v_exercise->>'equipment',''),nullif(v_exercise->>'difficulty',''),v_exercise->'video',nullif(v_exercise->>'executionNotes',''),array(select jsonb_array_elements_text(coalesce(v_exercise->'sourceWorkbooks','[]'::jsonb))),coalesce(v_exercise->'sourceReferences','[]'::jsonb),coalesce(v_exercise->>'status','active'))
    on conflict(id) do update set name=excluded.name,normalized_name=excluded.normalized_name,aliases=excluded.aliases,category=excluded.category,primary_muscle_group=excluded.primary_muscle_group,secondary_muscle_groups=excluded.secondary_muscle_groups,equipment=excluded.equipment,difficulty=excluded.difficulty,video=excluded.video,execution_notes=excluded.execution_notes,source_workbooks=excluded.source_workbooks,source_references=excluded.source_references,status=excluded.status;
  end loop;
  for v_program in select * from jsonb_array_elements(v_programs) loop
    insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,source_sheet,status,official)
    values(v_program->>'id',null,v_program->>'name',nullif(v_program->>'description',''),nullif(v_program->>'programType',''),nullif(v_program->>'difficulty',''),nullif(v_program->>'trainingFrequency','')::smallint,array(select jsonb_array_elements_text(coalesce(v_program->'equipment','[]'::jsonb))),coalesce(v_program->>'sourceWorkbook',''),nullif(v_program->>'sourceSheet',''),coalesce(nullif(v_program->>'status','')::public.workout_program_status,'active'),true)
    on conflict(id) do update set name=excluded.name,description=excluded.description,program_type=excluded.program_type,difficulty=excluded.difficulty,training_frequency=excluded.training_frequency,equipment=excluded.equipment,source_workbook=excluded.source_workbook,source_sheet=excluded.source_sheet,status=excluded.status where public.workout_programs.official;
    delete from public.workout_program_days where program_id=v_program->>'id';
    for v_day in select * from jsonb_array_elements(coalesce(v_program->'days','[]'::jsonb)) loop
      insert into public.workout_program_days(id,program_id,name,sort_order,source_sheet) values(v_day->>'id',v_program->>'id',v_day->>'name',coalesce((v_day->>'order')::smallint,0),nullif(v_day->>'sourceSheet',''));
      for v_entry in select * from jsonb_array_elements(coalesce(v_day->'exercises','[]'::jsonb)) loop
        insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,source_row)
        values(v_entry->>'id',v_day->>'id',v_entry->>'exerciseId',coalesce((v_entry->>'order')::smallint,0),nullif(v_entry->>'sets',''),nullif(v_entry->>'reps',''),nullif(v_entry->>'rest',''),nullif(v_entry->>'notes',''),nullif(v_entry->>'sourceRow','')::integer);
        for v_set in select * from jsonb_array_elements(coalesce(v_entry->'setPrescriptions','[]'::jsonb)) loop
          insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions) values(v_set->>'id',v_entry->>'id',coalesce((v_set->>'order')::smallint,0),nullif(v_set->>'repetitions',''));
        end loop;
      end loop;
    end loop;
  end loop;
end $migration$;

commit;
`;

await writeFile(output, sql);
console.log(JSON.stringify({ exercises: exercises.length, programs: programs.length, output: output.pathname }));
