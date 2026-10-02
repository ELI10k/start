import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(process.env.ENV_FILE || ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing Supabase environment variables");

const readJson = (name) => JSON.parse(fs.readFileSync(new URL(`./data/${name}`, import.meta.url), "utf8"));
const newExercises = readJson("resistance-new-exercises.json");
const existingMatches = readJson("resistance-existing-matches.json");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const normalizeName = (value) => value.normalize("NFKD")
  .replace(/[\u0591-\u05C7]/g, "").replace(/[־–—-]/g, " ")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
const sourceReference = (name, href) => ({ workbook: "instructor.co.il", sheet: "כוח והתנגדות", cell: href, name });
const muscle = (value) => value === "כתף" ? "כתפיים" : value;

const requestedIds = newExercises.map(({ id }) => id);
const { data: present, error: lookupError } = await supabase.from("workout_exercises").select("id").in("id", requestedIds);
if (lookupError) throw lookupError;
const presentIds = new Set((present ?? []).map(({ id }) => id));

const rows = newExercises.filter(({ id }) => !presentIds.has(id)).map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  normalized_name: normalizeName(exercise.name),
  aliases: [],
  category: exercise.category,
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

const matchesById = Map.groupBy(existingMatches, ({ existingId }) => existingId);
for (const [id, matches] of matchesById) {
  const { data: current, error: readError } = await supabase
    .from("workout_exercises")
    .select("aliases,source_workbooks,source_references")
    .eq("id", id).single();
  if (readError) throw readError;

  const aliases = [...new Set([...(current.aliases ?? []), ...matches.map(({ name }) => name)])];
  const references = [...(current.source_references ?? [])];
  for (const match of matches) {
    if (!references.some((reference) => reference?.cell === match.href)) references.push(sourceReference(match.name, match.href));
  }
  const representative = matches[0];
  const category = representative.equipment[0] || "כוח והתנגדות";
  const primary = muscle(representative.muscles[0] || "כל הגוף");
  const secondary = representative.muscles.slice(1).map(muscle);
  const { error: updateError } = await supabase.from("workout_exercises").update({
    aliases,
    category,
    equipment: representative.equipment.join(" ו-") || "משקל גוף",
    primary_muscle_group: primary,
    secondary_muscle_groups: secondary,
    source_workbooks: [...new Set([...(current.source_workbooks ?? []), "instructor.co.il"])],
    source_references: references,
  }).eq("id", id);
  if (updateError) throw updateError;
}

const { data: verified, error: verifyError } = await supabase
  .from("workout_exercises").select("id,video,image_url,status,category,primary_muscle_group").in("id", requestedIds);
if (verifyError) throw verifyError;
const valid = (verified ?? []).filter((exercise) => exercise.status === "active"
  && exercise.video?.provider === "self-hosted" && exercise.video?.url
  && exercise.image_url && exercise.category && exercise.primary_muscle_group);
if (valid.length !== newExercises.length) throw new Error(`Expected ${newExercises.length} complete rows, found ${valid.length}`);

console.log(JSON.stringify({ inserted: rows.length, alreadyPresent: presentIds.size, existingMatchesUpdated: existingMatches.length, verified: valid.length }, null, 2));
