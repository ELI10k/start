import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("primary client navigation explicitly prefetches personalized destinations", async () => {
  const [bottomNav, shell, home, workoutTile] = await Promise.all([
    source("components/BottomNav.tsx"),
    source("components/client/ClientShell.tsx"),
    source("app/page.tsx"),
    source("components/workouts/client/DashboardWorkoutWidget.tsx"),
  ]);

  assert.match(bottomNav, /href=\{href\} prefetch=\{true\}/);
  assert.match(shell, /href=\{item\.href\} prefetch=\{true\}/);
  for (const href of ["nutrition", "check-in", "progress"])
    assert.match(home, new RegExp(`href="/${href}" prefetch=\\{true\\}`));
  assert.match(workoutTile, /prefetch=\{true\}/);
});

test("every primary mobile destination has an immediate loading shell", async () => {
  const bottomNav = await source("components/BottomNav.tsx");
  const destinations = [...bottomNav.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(destinations, ["/", "/content", "/shopping", "/notifications", "/profile"]);

  for (const destination of destinations) {
    const path = destination === "/" ? "app/loading.tsx" : `app${destination}/loading.tsx`;
    const loading = await source(path);
    assert.match(loading, /role="status"|ClientLoading/);
  }
});

test("the client menu starts plan, meals, and daily selections together", async () => {
  const repository = await source("lib/data/product-repository.ts");
  assert.match(
    repository,
    /selectionPromise = readSelections\(\);[\s\S]*?Promise\.all\(\[\s*readPlan\(assignment\.meal_plan_id\),\s*readMeals\(assignment\.meal_plan_id\),\s*\]\)/,
  );
  assert.doesNotMatch(repository, /\.in\("group_id", groupIds\)/);
});

test("prefetched personalized screens stay available through the next tap", async () => {
  const config = await source("next.config.ts");
  assert.match(config, /staleTimes: \{ dynamic: 30 \}/);

  // Writes invalidate affected entries instead of waiting for the short cache
  // ceiling. These cover nutrition, progress, notifications and workout/home
  // state so a future speed change cannot silently reintroduce stale local data.
  const actions = await Promise.all([
    source("app/actions/food-log.ts"),
    source("app/actions/product.ts"),
    source("app/actions/notifications.ts"),
    source("app/actions/onboarding.ts"),
  ]);
  for (const action of actions) assert.match(action, /revalidatePath\(/);
});
