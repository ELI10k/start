// Turns scripts/data/exercise-guidance.mjs into a migration.
//
// Generated rather than hand-written because the content is Hebrew with quotes
// and arrays, and one escaping slip in 37 UPDATE statements is a broken
// migration. The generator also refuses to emit anything it cannot check.
//
// The migration is deliberately conservative:
//   - it only fills columns that are empty, so a coach who has already written
//     something through the exercise library is never overwritten;
//   - it touches only the exercises the seven approved programmes use;
//   - it carries its own rollback.
//
//   node scripts/generate-exercise-guidance-migration.mjs <inventory.json> <out.sql>
import { readFileSync, writeFileSync } from "node:fs";
import { GUIDANCE } from "./data/exercise-guidance.mjs";

const [inventoryPath, outPath] = process.argv.slice(2);
if (!inventoryPath || !outPath) throw new Error("usage: <inventory.json> <out.sql>");

const raw = JSON.parse(readFileSync(inventoryPath, "utf8"));
const catalogue = raw.rows ? raw.rows[0].exercises : raw.exercises;
const known = new Map(catalogue.map((item) => [item.id, item]));

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const textArray = (values) => `array[${values.map(quote).join(",")}]::text[]`;

const problems = [];
const ids = Object.keys(GUIDANCE);

// Every id must be a real exercise one of the seven programmes uses. A typo here
// would silently write nothing, and the migration would look like it worked.
for (const id of ids) if (!known.has(id)) problems.push(`unknown exercise id: ${id}`);
for (const [id, entry] of Object.entries(GUIDANCE)) {
  if (!entry.howTo?.trim()) problems.push(`${id}: no howTo`);
  if (!(entry.cues?.length >= 3)) problems.push(`${id}: fewer than 3 cues`);
  if (!(entry.commonMistakes?.length >= 2)) problems.push(`${id}: fewer than 2 mistakes`);
  // The panel caps both lists at six and drops the rest silently.
  if (entry.cues?.length > 6) problems.push(`${id}: more than 6 cues`);
  if (entry.commonMistakes?.length > 6) problems.push(`${id}: more than 6 mistakes`);
}

// The same paragraph pasted onto every exercise is the failure this content is
// meant to avoid, so it is checked rather than trusted.
const seen = new Map();
for (const [id, entry] of Object.entries(GUIDANCE)) {
  const first = entry.cues[0].trim();
  if (seen.has(first)) problems.push(`${id}: first cue is identical to ${seen.get(first)}`);
  else seen.set(first, id);
  if (seen.has(entry.howTo.trim())) problems.push(`${id}: howTo identical to ${seen.get(entry.howTo.trim())}`);
  else seen.set(entry.howTo.trim(), id);
}

const missing = catalogue.filter((item) => !GUIDANCE[item.id]);

if (problems.length) {
  console.error(problems.join("\n"));
  throw new Error(`${problems.length} problems in the guidance content`);
}

const statements = ids.map((id) => {
  const entry = GUIDANCE[id];
  const sets = [
    // coalesce, so anything a coach already wrote wins over this draft.
    `how_to = coalesce(nullif(trim(how_to), ''), ${quote(entry.howTo.trim())})`,
    `cues = case when coalesce(array_length(cues, 1), 0) = 0 then ${textArray(entry.cues)} else cues end`,
    `common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then ${textArray(entry.commonMistakes)} else common_mistakes end`,
  ];
  if (entry.equipment) sets.push(`equipment = coalesce(nullif(trim(equipment), ''), ${quote(entry.equipment)})`);
  return `update public.workout_exercises set\n  ${sets.join(",\n  ")}\nwhere id = ${quote(id)};`;
});

const sql = `begin;

-- Coaching content for the ${ids.length} exercises the seven approved programmes use.
--
-- Measured before writing this: all ${catalogue.length} of them carry a muscle group and a
-- video, and not one carries a how-to, a cue, a common mistake or an equipment
-- name. The "דגשים לתרגיל" sheet therefore had exactly one section to show and
-- listed the other four as missing, on every exercise, in every programme.
--
-- Written per exercise. It is general gym technique - what a coach says on the
-- floor - and carries no diagnosis or medical claim. It is drafted content and
-- wants Eli's sign-off; the exercise library already has an editor, so any line
-- here can be corrected in the product without another migration.
--
-- Every column is filled only where it is empty. A coach who has already written
-- guidance for an exercise keeps it - this cannot overwrite a human.
--
-- Rows written: ${ids.length}. Tables touched: public.workout_exercises only.
-- Columns touched: how_to, cues, common_mistakes, equipment.
--
-- Rollback: the statement below restores the pre-migration state by emptying
-- exactly the rows this fills. Run it only if nothing has been edited since.
--
--   update public.workout_exercises
--      set how_to = null, cues = '{}'::text[], common_mistakes = '{}'::text[], equipment = null
--    where id in (${ids.map((id) => `'${id}'`).join(", ")});

${statements.join("\n\n")}

commit;
`;

writeFileSync(outPath, sql);
console.log(JSON.stringify({
  exercisesInSevenProgrammes: catalogue.length,
  written: ids.length,
  stillWithoutContent: missing.map((item) => ({ id: item.id, name: item.name })),
  statements: statements.length,
  out: outPath,
}, null, 2));
