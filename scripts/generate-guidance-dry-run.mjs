// Builds the dry run for the guidance migration.
//
// It does more than execute-and-roll-back. Inside the transaction it first
// pretends a coach has already written guidance for one exercise, then runs the
// migration, then checks that the coach's words are still there and everything
// else was filled. That is the claim worth testing - "it only fills empty
// columns" is not proven by a database where every column happens to be empty.
//
//   node scripts/generate-guidance-dry-run.mjs <migration.sql> <out.sql>
import { readFileSync, writeFileSync } from "node:fs";

const [migrationPath, outPath] = process.argv.slice(2);
if (!migrationPath || !outPath) throw new Error("usage: <migration.sql> <out.sql>");

const migration = readFileSync(migrationPath, "utf8");
// The statements only - the wrapper transaction is the dry run's own.
const body = migration.replace(/^begin;/m, "").replace(/commit;\s*$/m, "").trim();

const GUARDED = "exercise-rr4mtu"; // לחיצת חזה במוט

const sql = `begin;

-- A coach who has already written for this exercise. If the migration is right,
-- every one of these four values is still here at the end.
update public.workout_exercises set
  how_to = 'טקסט שהמאמן כתב בעצמו',
  cues = array['דגש שהמאמן כתב']::text[],
  common_mistakes = array['טעות שהמאמן כתב']::text[],
  equipment = 'ציוד שהמאמן כתב'
where id = '${GUARDED}';

-- Everything the migration would do.
${body}

-- What actually happened, as one row.
select jsonb_build_object(
  'coachRowUntouched', (
    select how_to = 'טקסט שהמאמן כתב בעצמו'
       and cues = array['דגש שהמאמן כתב']::text[]
       and common_mistakes = array['טעות שהמאמן כתב']::text[]
       and equipment = 'ציוד שהמאמן כתב'
      from public.workout_exercises where id = '${GUARDED}'
  ),
  'filledHowTo', (select count(*) from public.workout_exercises w where w.id in (${idList(migration)}) and nullif(trim(w.how_to),'') is not null),
  'filledCues', (select count(*) from public.workout_exercises w where w.id in (${idList(migration)}) and coalesce(array_length(w.cues,1),0) > 0),
  'filledMistakes', (select count(*) from public.workout_exercises w where w.id in (${idList(migration)}) and coalesce(array_length(w.common_mistakes,1),0) > 0),
  'filledEquipment', (select count(*) from public.workout_exercises w where w.id in (${idList(migration)}) and nullif(trim(w.equipment),'') is not null),
  -- Nothing outside the 37 may move.
  'othersTouched', (
    select count(*) from public.workout_exercises w
     where w.id not in (${idList(migration)})
       and (nullif(trim(w.how_to),'') is not null or coalesce(array_length(w.cues,1),0) > 0 or coalesce(array_length(w.common_mistakes,1),0) > 0)
  ),
  'catalogueTotal', (select count(*) from public.workout_exercises)
) as dry_run;

rollback;
`;

function idList(text) {
  const match = text.match(/where id in \(([^)]+)\);/);
  if (!match) throw new Error("could not read the id list out of the migration's rollback note");
  return match[1];
}

writeFileSync(outPath, sql);
console.log(JSON.stringify({ out: outPath, guardedExercise: GUARDED, statements: (body.match(/^update /gm) ?? []).length }, null, 2));
