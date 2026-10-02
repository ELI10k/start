import { writeFile } from "node:fs/promises";
import { newExercises, existingMatches, SOURCE_PAGE } from "./data/bodyweight-instructor-exercises.mjs";

const output = new URL("../supabase/migrations/20261002174955_add_bodyweight_exercise_catalog.sql", import.meta.url);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const array = (values) => `array[${values.map(quote).join(",")}]::text[]`;
const normalized = (value) => String(value)
  .normalize("NFKC")
  .toLocaleLowerCase("he")
  .replace(/[־–—-]/g, " ")
  .replace(/[\u0591-\u05BD\u05BF-\u05C7׳'״"(),.]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const inserts = newExercises.map((exercise) => `insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  ${quote(exercise.id)},${quote(exercise.name)},${quote(normalized(exercise.name))},'{}'::text[],
  'משקל גוף',${quote(exercise.primaryMuscleGroup)},${array(exercise.secondaryMuscleGroups)},
  ${quote(exercise.equipment)},${quote(exercise.difficulty)},
  ${json({ url: exercise.videoUrl, provider: "self-hosted", title: exercise.name })},
  ${quote(exercise.howTo)},array['instructor.co.il']::text[],
  ${json([{ workbook: "instructor.co.il", sheet: "משקל גוף", cell: exercise.href, name: exercise.name }])},
  'active',${quote(exercise.imageUrl)},${quote(exercise.howTo)},${array(exercise.cues)},${array(exercise.commonMistakes)}
)
on conflict (id) do nothing;`).join("\n\n");

const aliasUpdates = existingMatches.map((match) => `update public.workout_exercises
set aliases = case when ${quote(match.alias)} = any(aliases) then aliases else array_append(aliases, ${quote(match.alias)}) end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> ${json([{ workbook: "instructor.co.il", sheet: "משקל גוף", cell: match.href, name: match.alias }])}
      then source_references
      else source_references || ${json([{ workbook: "instructor.co.il", sheet: "משקל גוף", cell: match.href, name: match.alias }])}
    end,
    updated_at = now()
where id = ${quote(match.id)};`).join("\n\n");

const sql = `begin;

-- ${newExercises.length} original catalogue entries and exercise videos derived from the movement names on:
-- ${SOURCE_PAGE}
-- The referenced site supplied only the inventory. Images, videos and coaching copy are original project assets.
-- Existing semantic matches receive aliases instead of duplicate rows.

${inserts}

${aliasUpdates}

commit;
`;

await writeFile(output, sql);
console.log(JSON.stringify({ output: output.pathname, inserted: newExercises.length, aliases: existingMatches.length }));
