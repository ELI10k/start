import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { nutritionMacroPercentages, nutritionTargetPercentages, sumNutrition } from "../lib/nutrition/progress.ts";

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
  assert.match(panel, /חסרים בממוצע.*גרם חלבון ביום/);
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
