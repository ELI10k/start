import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calendarNutritionWeek, nutritionMacroPercentages, nutritionTargetPercentages, sumNutrition } from "../lib/nutrition/progress.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("macro percentages use calories rather than raw gram shares", () => {
  assert.deepEqual(nutritionMacroPercentages({ protein: 150, carbohydrates: 200, fat: 60 }), {
    protein: 31,
    carbohydrates: 41,
    fat: 28,
  });
});

test("empty macros and missing targets do not divide by zero", () => {
  assert.deepEqual(nutritionMacroPercentages({ protein: 0, carbohydrates: 0, fat: 0 }), { protein: 0, carbohydrates: 0, fat: 0 });
  assert.deepEqual(nutritionTargetPercentages({ calories: 2000, protein: null, carbohydrates: null, fat: null }), { protein: 0, carbohydrates: 0, fat: 0 });
});

test("nutrition totals include each intake source exactly once", () => {
  assert.deepEqual(sumNutrition([
    { day: "2026-10-11", calories: 1800, protein: 140, carbohydrates: 190, fat: 52 },
    { day: "2026-10-12", calories: 2050, protein: 155, carbohydrates: 210, fat: 58 },
  ]), { calories: 3850, protein: 295, carbohydrates: 400, fat: 110 });
});

test("weekly nutrition always spans Sunday through Saturday", () => {
  const week = calendarNutritionWeek([
    { day: "2026-10-10", calories: 900, protein: 50, carbohydrates: 100, fat: 30 },
    { day: "2026-10-11", calories: 1700, protein: 120, carbohydrates: 180, fat: 50 },
    { day: "2026-10-14", calories: 1900, protein: 140, carbohydrates: 200, fat: 55 },
  ], "2026-10-14");
  assert.deepEqual(week.map((day) => day.day), [
    "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17",
  ]);
  assert.equal(week[0].calories, 1700);
  assert.equal(week[3].protein, 140);
  assert.deepEqual(week[6], { day: "2026-10-17", calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
});

test("progress UI offers week and month nutrition charts and stripes only the excess above the personal goal", async () => {
  const [dashboard, panel, repository, css] = await Promise.all([
    source("components/client/ProgressMetricsDashboard.tsx"),
    source("components/client/NutritionProgressPanel.tsx"),
    source("lib/data/product-repository.ts"),
    source("app/globals.css"),
  ]);
  assert.match(dashboard, /id: "nutrition"/);
  assert.match(panel, />שבוע</);
  assert.match(panel, />חודש</);
  assert.match(panel, /key=\{period\}/);
  assert.match(panel, /calendarNutritionWeek\(days, anchorDay\)/);
  assert.match(panel, /חסרים בממוצע.*גרם חלבון ביום/);
  assert.match(panel, /targets\.calories \* selected\.length/);
  assert.match(panel, /מתוך.*periodCalorieTarget\.toLocaleString/);
  assert.match(panel, /day\.calories > goal/);
  assert.match(panel, /data-over-goal/);
  assert.match(css, /repeating-linear-gradient\(135deg, var\(--red\)/);
  assert.match(css, /health-chart\[data-monthly\].*min-width: 0/);
  assert.match(css, /data-macro="protein"[^\n]+background: var\(--green\)/);
  assert.match(css, /data-macro="carbohydrates"[^\n]+background: #F2B705/);
  assert.match(css, /data-macro="carbohydrates"\] \{ color: var\(--ink\)/);
  assert.match(css, /data-macro="fat"[^\n]+background: var\(--red\)/);
  assert.match(repository, /eaten_meal_items/);
  assert.match(repository, /client_food_log/);
});

test("progress opens on nutrition instead of weigh-ins", async () => {
  const dashboard = await source("components/client/ProgressMetricsDashboard.tsx");
  // Nutrition is still the default; a home card may ask for its own metric
  // (/progress?metric=steps), which is the only other way in.
  assert.match(dashboard, /initialMetric = "nutrition"/);
  assert.match(dashboard, /useState<Metric>\(initialMetric\)/);
  assert.doesNotMatch(dashboard, /useState<Metric>\("weight"\)/);
});

test("bounded progress summaries opt into the phone viewport-fit layout", async () => {
  const [page, dashboard, healthPanel, css] = await Promise.all([
    source("app/progress/page.tsx"),
    source("components/client/ProgressMetricsDashboard.tsx"),
    source("components/client/HealthProgressPanel.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(page, /ClientShell className="client-app-shell--progress"/);
  assert.match(dashboard, /data-metric=\{metric\} data-viewport-fit=\{metric === "nutrition" \|\| metric === "steps" \|\| metric === "sleep" \|\| undefined\}/);
  assert.match(css, /html:has\(\.progress-metrics\[data-viewport-fit\]\)/);
  assert.match(css, /\.client-app-shell--progress:has\(\.progress-metrics\[data-viewport-fit\]\) \{[\s\S]*?display:\s*flex;[\s\S]*?height:\s*100dvh/);
  assert.match(css, /\.client-app-shell--progress:has\(\.progress-metrics\[data-viewport-fit\]\) \.client-app-content \{[\s\S]*?height:\s*auto;[\s\S]*?flex:\s*1 1 auto/);
  assert.match(css, /\.progress-metrics\[data-viewport-fit\] \.health-chart__plot \{ height: 100%/);
  assert.match(css, /\.health-chart\[data-monthly\] \.health-chart__plot \{\s*min-width: 0/);
  assert.match(css, /@media \(max-width: 767px\) and \(min-height: 740px\)/);
  assert.match(css, /data-metric="nutrition"\] \.health-chart \{ min-height: 5rem/);
  assert.match(healthPanel, /<strong>\{average !== null \? average\.toLocaleString\("he-IL"\)/);
  assert.match(healthPanel, /health-summary-card__goal.*מתוך.*summary\.goal\.toLocaleString\("he-IL"\)/);
  assert.match(healthPanel, /periodGoal = summary\.goal \* dayCount/);
  assert.match(healthPanel, /health-stat-grid__goal.*מתוך.*periodGoal\.toLocaleString\("he-IL"\)/);
  assert.match(css, /health-summary-card__goal \{ color: var\(--green\); font-weight: 700/);
  assert.match(css, /health-stat-grid__goal \{ grid-column: 2; color: var\(--green\)/);
  assert.doesNotMatch(healthPanel, /minmax\(\$\{monthly \? "2\.75rem"/);
});
