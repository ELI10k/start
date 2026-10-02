import fs from "node:fs";
import { canonicalizeEquipment, categorizeExercise } from "./lib/exercise-taxonomy.mjs";

const readJson = (name) => JSON.parse(fs.readFileSync(new URL(`./data/${name}`, import.meta.url), "utf8"));
const newExercises = readJson("resistance-new-exercises.json");
const existingMatches = readJson("resistance-existing-matches.json");
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const textArray = (values) => `array[${values.map(q).join(",")}]::text[]`;
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;
const normalizeName = (value) => value.normalize("NFKD").replace(/[\u0591-\u05C7]/g, "")
  .replace(/[־–—-]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
const sourceReference = (name, href) => ({ workbook: "instructor.co.il", sheet: "כוח והתנגדות", cell: href, name });
const muscle = (value) => value === "כתף" ? "כתפיים" : value;

const statements = ["begin;", "", "-- Original male-only media and catalogue records for the resistance exercise index."];
for (const exercise of newExercises) {
  statements.push(`insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  ${q(exercise.id)},${q(exercise.name)},${q(normalizeName(exercise.name))},'{}'::text[],
  ${q(categorizeExercise(exercise))},${q(exercise.primaryMuscleGroup)},${textArray(exercise.secondaryMuscleGroups)},
  ${q(exercise.equipment)},${q(exercise.difficulty)},${json({ url: exercise.videoUrl, provider: "self-hosted", title: exercise.name })},
  ${q(exercise.howTo)},array['instructor.co.il']::text[],${json([sourceReference(exercise.name, exercise.href)])},'active',
  ${q(exercise.imageUrl)},${q(exercise.howTo)},${textArray(exercise.cues)},${textArray(exercise.commonMistakes)}
) on conflict (id) do nothing;`, "");
}

for (const match of existingMatches) {
  const equipment = canonicalizeEquipment({ id: match.existingId, name: match.name, equipment: match.equipment.join(" ו-") || undefined });
  const category = categorizeExercise({ id: match.existingId, name: match.name, equipment });
  statements.push(`update public.workout_exercises set
  aliases = case when ${q(match.name)} = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),${q(match.name)}) end,
  category = ${q(category)}, equipment = ${q(equipment)},
  primary_muscle_group = ${q(muscle(match.muscles[0] || "כל הגוף"))}, secondary_muscle_groups = ${textArray(match.muscles.slice(1).map(muscle))},
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> ${json([{ cell: match.href }])} then source_references else coalesce(source_references,'[]'::jsonb) || ${json([sourceReference(match.name, match.href)])} end
where id = ${q(match.existingId)};`, "");
}
statements.push("commit;", "");
process.stdout.write(statements.join("\n"));
