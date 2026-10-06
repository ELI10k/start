import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the profile guide link is the last item in the app settings group", async () => {
  const source = await file("app/profile/page.tsx");
  const guide = source.indexOf("מדריך השימוש באפליקציה");
  const goals = source.indexOf("<ProfileNutritionGoalsSheet");
  const support = source.indexOf("תמיכה");
  const account = source.indexOf(">חשבון</h2>");
  assert.ok(guide >= 0, "guide link is missing");
  assert.ok(goals < guide, "guide link must not remain above change goals");
  assert.ok(support < guide, "guide link must appear after support");
  assert.ok(guide < account, "guide link must remain inside the app settings group");
  assert.equal(source.match(/מדריך השימוש באפליקציה/g)?.length, 1);
  assert.match(source, /content\/10000000-0000-4000-8000-000000000004/);
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
