import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20261010173921_expand_curated_exercise_catalog.sql");
const migration = readFileSync(migrationPath, "utf8");
const catalogMatch = migration.match(/\$catalog\$(\[[\s\S]*?\])\$catalog\$/);
assert.ok(catalogMatch, "curated catalogue JSON is missing from the migration");
const catalog = JSON.parse(catalogMatch[1]) as Array<{
  id: string;
  slug: string;
  dir: string;
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  howTo: string;
  cues: string[];
  mistakes: string[];
}>;

test("curated audit adds 35 distinct, fully classified exercises", () => {
  assert.equal(catalog.length, 35);
  assert.equal(new Set(catalog.map((exercise) => exercise.id)).size, 35);
  assert.equal(new Set(catalog.map((exercise) => exercise.slug)).size, 35);
  assert.deepEqual(
    new Set(catalog.map((exercise) => exercise.category)),
    new Set(["חימום לפני אימון", "משקל גוף", "משקולות", "מכונות"]),
  );
  for (const exercise of catalog) {
    assert.ok(exercise.name.length > 3, exercise.id);
    assert.ok(exercise.muscle.length > 1, `${exercise.id}: muscle`);
    assert.ok(exercise.equipment.length > 2, `${exercise.id}: equipment`);
    assert.ok(exercise.howTo.length > 40, `${exercise.id}: guidance`);
    assert.equal(exercise.cues.length, 3, `${exercise.id}: cues`);
    assert.equal(exercise.mistakes.length, 3, `${exercise.id}: mistakes`);
  }
  for (const expected of ["חימום", "שרירי ליבה", "רגליים", "חזה", "גב", "כתפיים", "יד קדמית", "יד אחורית"]) {
    assert.ok(catalog.some((exercise) => exercise.muscle === expected), `missing ${expected}`);
  }
});

test("every curated exercise has an original poster and self-hosted video", () => {
  for (const exercise of catalog) {
    const posterPath = path.join(root, `public/exercises/${exercise.dir}/${exercise.slug}.jpg`);
    const videoPath = path.join(root, `public/exercises/${exercise.dir}/${exercise.slug}.mp4`);
    assert.equal(existsSync(posterPath), true, `missing poster for ${exercise.id}`);
    assert.equal(existsSync(videoPath), true, `missing video for ${exercise.id}`);
    assert.ok(statSync(posterPath).size > 10_000, `poster is unexpectedly small for ${exercise.id}`);
    assert.ok(statSync(videoPath).size > 100_000, `video is unexpectedly small for ${exercise.id}`);
    assert.match(migration, new RegExp(`/exercises/%s/%s\\.jpg`));
    assert.match(migration, new RegExp(`/exercises/%s/%s\\.mp4`));
  }
  assert.match(migration, /ACE Exercise Library/);
  assert.match(migration, /NASM Exercise Library/);
  assert.match(migration, /on conflict \(id\) do nothing/);
});
