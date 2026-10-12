import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20261012041217_complete_bodyweight_exercise_images.sql",
);
const migration = readFileSync(migrationPath, "utf8");

const expectedUpdates = new Map([
  ["exercise-p2ohuv", "/exercises/bodyweight/bicycle-crunch.jpg"],
  ["bodyweight-standing-calf-raise", "/exercises/bodyweight/standing-calf-raise.jpg"],
  ["exercise-1urdov4", "/exercises/bodyweight/leg-raise.jpg"],
  ["exercise-155pu7s", "/exercises/warmup/dynamic-warmup.jpg"],
  ["exercise-1k0kcxw", "/exercises/bodyweight/close-grip-pushup.jpg"],
  ["exercise-8q99c1", "/exercises/bodyweight/close-grip-pushup.jpg"],
  ["exercise-pn4ire", "/exercises/bodyweight/crunch.jpg"],
  ["exercise-1fo5t9c", "/exercises/bodyweight/bodyweight-curl.jpg"],
  ["exercise-2ez0zf", "/exercises/bodyweight/lunge.jpg"],
  ["exercise-1rpyv0f", "/exercises/bodyweight/pike-pushup.jpg"],
  ["exercise-1wwie67", "/exercises/bodyweight/wide-pike-pushup.jpg"],
  ["exercise-1ba2nb8", "/exercises/bodyweight/pullup.jpg"],
  ["exercise-say88l", "/exercises/bodyweight/narrow-pullup.jpg"],
  ["exercise-1igvlte", "/exercises/bodyweight/wide-pullup.jpg"],
  ["exercise-1oguz0o", "/exercises/bodyweight/sumo-squat.jpg"],
  ["exercise-n1izh5", "/exercises/bodyweight/squat.jpg"],
  ["exercise-150pt7l", "/exercises/bodyweight/decline-pushup.jpg"],
  ["exercise-dhk3wr", "/exercises/bodyweight/incline-pushup.jpg"],
  ["exercise-hdg3yz", "/exercises/bodyweight/pushup.jpg"],
]);

const replacedExistingPosters = [
  "/exercises/back/scapular-pull-up.jpg",
  "/exercises/bodyweight/bird-dog.jpg",
  "/exercises/bodyweight/captain-chair-straight-leg-raise.jpg",
  "/exercises/bodyweight/chair-squat.jpg",
  "/exercises/bodyweight/side-lying-quad-stretch.jpg",
  "/exercises/bodyweight/side-lying-side-stretch.jpg",
  "/exercises/bodyweight/vertical-hip-lift.jpg",
  "/exercises/bodyweight/wall-bird-dog.jpg",
  "/exercises/bodyweight/wall-pushup.jpg",
  "/exercises/core/hanging-knee-raise.jpg",
];

test("legacy bodyweight thumbnails are replaced with self-hosted posters", () => {
  const updates = new Map(
    [...migration.matchAll(/\('([^']+)', '([^']+\.jpg)'\)/g)].map((match) => [match[1], match[2]]),
  );

  assert.deepEqual(updates, expectedUpdates);
  assert.doesNotMatch(migration, /i\.ytimg\.com|youtube\.com/);
  assert.match(migration, /image_url = 'https:\/\/start\.elicohenfitness\.co\.il' \|\| replacement\.image_path/);
});

test("all new and replaced bodyweight posters are committed as substantial JPEG files", () => {
  const posterPaths = new Set([...expectedUpdates.values(), ...replacedExistingPosters]);
  assert.equal(posterPaths.size, 28);

  for (const posterPath of posterPaths) {
    const absolutePath = path.join(root, "public", posterPath.replace(/^\/exercises\//, "exercises/"));
    assert.equal(existsSync(absolutePath), true, `missing poster ${posterPath}`);
    assert.ok(statSync(absolutePath).size > 25_000, `poster is unexpectedly small: ${posterPath}`);
  }
});
