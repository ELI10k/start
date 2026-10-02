import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { existingMatches, newExercises } from "./data/bodyweight-instructor-exercises.mjs";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const normalizeName = (value) => value
  .normalize("NFKD")
  .replace(/[\u0591-\u05C7]/g, "")
  .replace(/[־–—-]/g, " ")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .toLowerCase();

const sourceReference = (name, href) => ({
  workbook: "instructor.co.il",
  sheet: "משקל גוף",
  cell: href,
  name,
});

const requestedIds = newExercises.map(({ id }) => id);
const { data: alreadyPresent, error: lookupError } = await supabase
  .from("workout_exercises")
  .select("id")
  .in("id", requestedIds);

if (lookupError) throw lookupError;

const presentIds = new Set((alreadyPresent ?? []).map(({ id }) => id));
const missingExercises = newExercises.filter(({ id }) => !presentIds.has(id));

const rows = missingExercises.map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  normalized_name: normalizeName(exercise.name),
  aliases: [],
  category: "משקל גוף",
  primary_muscle_group: exercise.primaryMuscleGroup,
  secondary_muscle_groups: exercise.secondaryMuscleGroups,
  equipment: exercise.equipment,
  difficulty: exercise.difficulty,
  video: { url: exercise.videoUrl, provider: "self-hosted", title: exercise.name },
  execution_notes: exercise.howTo,
  source_workbooks: ["instructor.co.il"],
  source_references: [sourceReference(exercise.name, exercise.href)],
  status: "active",
  image_url: exercise.imageUrl,
  how_to: exercise.howTo,
  cues: exercise.cues,
  common_mistakes: exercise.commonMistakes,
}));

if (rows.length) {
  const { error } = await supabase.from("workout_exercises").insert(rows);
  if (error) throw error;
}

const matchesById = Map.groupBy(existingMatches, ({ id }) => id);
for (const [id, matches] of matchesById) {
  const { data: current, error: readError } = await supabase
    .from("workout_exercises")
    .select("aliases,source_workbooks,source_references")
    .eq("id", id)
    .single();
  if (readError) throw readError;

  const aliases = [...new Set([...(current.aliases ?? []), ...matches.map(({ alias }) => alias)])];
  const references = [...(current.source_references ?? [])];
  for (const match of matches) {
    if (!references.some((reference) => reference?.cell === match.href)) {
      references.push(sourceReference(match.alias, match.href));
    }
  }

  const { error: updateError } = await supabase
    .from("workout_exercises")
    .update({
      aliases,
      source_workbooks: [...new Set([...(current.source_workbooks ?? []), "instructor.co.il"])],
      source_references: references,
    })
    .eq("id", id);
  if (updateError) throw updateError;
}

const { data: verified, error: verifyError } = await supabase
  .from("workout_exercises")
  .select("id,name,video,image_url,status")
  .in("id", requestedIds);
if (verifyError) throw verifyError;

const valid = (verified ?? []).filter((exercise) => (
  exercise.status === "active"
  && exercise.video?.provider === "self-hosted"
  && typeof exercise.video?.url === "string"
  && typeof exercise.image_url === "string"
));

if (valid.length !== newExercises.length) {
  throw new Error(`Verification failed: expected ${newExercises.length} complete rows, found ${valid.length}`);
}

console.log(JSON.stringify({
  inserted: rows.length,
  alreadyPresent: presentIds.size,
  existingMatchesUpdated: existingMatches.length,
  verified: valid.length,
}, null, 2));
