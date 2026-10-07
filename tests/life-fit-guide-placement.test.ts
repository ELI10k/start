import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the profile guide link appears above change goals", async () => {
  const source = await file("app/profile/page.tsx");
  const guide = source.indexOf("מדריך השימוש באפליקציה");
  const goals = source.indexOf("<ProfileNutritionGoalsSheet");
  const account = source.indexOf(">חשבון</h2>");
  assert.ok(guide >= 0, "guide link is missing");
  assert.ok(guide < goals, "guide link must appear above change goals");
  assert.ok(guide < account, "guide link must remain inside the app settings group");
  assert.equal(source.match(/מדריך השימוש באפליקציה/g)?.length, 1);
  assert.match(source, /content\/category\/start-guide/);
});

test("the complete Life Fit guide is published as seven ordered lessons", async () => {
  const migration = await file(
    "supabase/migrations/20261007141021_life_fit_training_series.sql",
  );
  const route = await file("app/media/life-fit-training/[lesson]/route.ts");
  const lessonIds =
    migration.match(/10000000-0000-4000-8000-0000000000(?:0[4-9]|10)/g) ?? [];
  const mediaRoutes =
    migration.match(/life-fit-training\/0[1-7]-[a-z-]+/g) ?? [];

  assert.equal(new Set(lessonIds).size, 7);
  assert.equal(new Set(mediaRoutes).size, 7);
  for (const order of [10, 20, 30, 40, 50, 60, 70]) {
    assert.match(migration, new RegExp(`'published', ${order}, null`));
  }
  assert.match(route, /const LESSON_FILES/);
  assert.match(route, /life-fit-training-series-v1/);
});

test("the guide is the first published course and replaces old intro fillers", async () => {
  const migration = await file(
    "supabase/migrations/20261004193000_life_fit_guide.sql",
  );
  assert.match(migration, /set name = 'מתחילים כאן'/);
  assert.match(migration, /sort_order = 0/);
  assert.match(migration, /active = true/);
  assert.match(migration, /set status = 'archived'/);
  assert.match(migration, /איך משתמשים ב־Life Fit/);
  assert.match(
    migration,
    /https:\/\/start\.elicohenfitness\.co\.il\/media\/life-fit-guide\.mp4/,
  );
});

test("the guide route and lesson screen use the native video player", async () => {
  const [route, lesson, refresh] = await Promise.all([
    file("app/media/life-fit-guide.mp4/route.ts"),
    file("app/content/[id]/page.tsx"),
    file("supabase/migrations/20261006180000_life_fit_guide_v2.sql"),
  ]);
  assert.match(route, /content-media\/life-fit-guide-v2\.mp4/);
  assert.match(lesson, /<NativeLessonPlayer/);
  assert.match(refresh, /life-fit-guide\.mp4\?v=2/);
});

test("a one-lesson course uses a nearly full-width card", async () => {
  const [page, rail, css] = await Promise.all([
    file("app/content/page.tsx"),
    file("components/client/CinemaRail.tsx"),
    file("app/globals.css"),
  ]);
  assert.match(page, /wide=\{course\.lessons\.length === 1\}/);
  assert.match(rail, /cinema-rail__track--wide/);
  assert.match(
    css,
    /\.cinema-rail__track--wide\s*\{[^}]*100vw[^}]*48rem[^}]*padding-inline: \.5rem/s,
  );
});
