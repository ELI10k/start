import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20261010164146_add_instructor_warmup_exercises.sql",
);

const missingSourceExercises = [
  {
    id: "warmup-lat-ball-stretch",
    slug: "lat-ball-stretch",
    source: "%d7%9e%d7%aa%d7%99%d7%97%d7%94-%d7%9c%d7%a8%d7%97%d7%91-%d7%92%d7%91%d7%99-%d7%a2%d7%9c-%d7%9b%d7%93%d7%95%d7%a8",
  },
  {
    id: "warmup-shoulder-circles-ball",
    slug: "shoulder-circles-ball",
    source: "circles-arm-shoulders-ball",
  },
  {
    id: "warmup-bent-arm-shoulder-circles",
    slug: "bent-arm-shoulder-circles",
    source: "circles-arm-shoulders",
  },
  {
    id: "warmup-straight-arm-shoulder-circles",
    slug: "straight-arm-shoulder-circles",
    source: "circles-straight-arm-shoulders",
  },
] as const;

test("the four sitemap gaps are inserted into the warm-up catalogue", () => {
  const migration = readFileSync(migrationPath, "utf8");

  for (const exercise of missingSourceExercises) {
    assert.match(migration, new RegExp(`'${exercise.id}'`));
    assert.match(migration, new RegExp(exercise.source));
    assert.match(migration, new RegExp(`/exercises/warmup/${exercise.slug}\\.jpg`));
    assert.match(migration, new RegExp(`/exercises/warmup/${exercise.slug}\\.mp4`));
  }

  assert.equal((migration.match(/'חימום לפני אימון'/g) ?? []).length, 5);
  assert.match(migration, /where id = 'exercise-155pu7s'/);
});

test("every new warm-up exercise has a poster and a self-hosted video", () => {
  for (const exercise of missingSourceExercises) {
    const posterPath = path.join(root, `public/exercises/warmup/${exercise.slug}.jpg`);
    const videoPath = path.join(root, `public/exercises/warmup/${exercise.slug}.mp4`);
    assert.equal(
      existsSync(posterPath),
      true,
      `missing poster for ${exercise.id}`,
    );
    assert.equal(
      existsSync(videoPath),
      true,
      `missing video for ${exercise.id}`,
    );
    assert.ok(statSync(posterPath).size > 10_000, `poster is unexpectedly small for ${exercise.id}`);
    assert.ok(statSync(videoPath).size > 100_000, `video is unexpectedly small for ${exercise.id}`);
  }
});
