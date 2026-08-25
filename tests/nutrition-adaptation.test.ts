import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNutritionProposals,
  proposeCalorieTarget,
  proposeMissedMeals,
  proposePortionChanges,
  summarizeProposals,
  type MealAnswer,
  type PortionObservation,
} from "../lib/nutrition/adaptation.ts";

const day = (index: number) => `2026-08-${String(index).padStart(2, "0")}`;

const observation = (index: number, reported: number | null, planned = 2): PortionObservation => ({
  date: day(index),
  mealId: "meal-dinner",
  mealTitle: "ארוחת ערב",
  groupId: "group-carbs",
  groupType: "carbohydrate",
  foodName: "אורז לבן",
  unit: "גרם",
  planned,
  reported,
});

test("a portion the client keeps correcting becomes the portion that is proposed", () => {
  // Nine days chosen, seven of them halved. That is not approximation.
  const observations = [
    ...Array.from({ length: 7 }, (_, i) => observation(i + 1, 50, 100)),
    observation(8, null, 100),
    observation(9, null, 100),
  ];
  const [proposal] = proposePortionChanges(observations);
  assert.equal(proposal.kind, "portion");
  assert.equal(proposal.planned, 100);
  assert.equal(proposal.proposed, 50);
  assert.equal(proposal.days, 9);
  assert.equal(proposal.corrected, 7);
  assert.equal(proposal.mealTitle, "ארוחת ערב");
  // The evidence carries the numbers, so the coach never has to take it on faith.
  assert.match(proposal.evidence.join(" "), /9 ימים/);
  assert.match(proposal.evidence.join(" "), /7 עם תיקון/);
});

test("the proposed quantity is the client's own median, rounded the way a menu is written", () => {
  // 95, 105 and 110 grams: the median is 105, and grams are written in fives.
  const observations = [
    observation(1, 95, 150), observation(2, 105, 150), observation(3, 110, 150),
    observation(4, 105, 150), observation(5, 95, 150), observation(6, 110, 150),
  ];
  const [proposal] = proposePortionChanges(observations);
  assert.equal(proposal.proposed, 105);
});

test("countable units keep their half rather than becoming a gram figure", () => {
  const pita = (index: number, reported: number | null): PortionObservation =>
    ({ ...observation(index, reported, 2), unit: "פיתות", foodName: "פיתה" });
  const [proposal] = proposePortionChanges([
    pita(1, 1), pita(2, 1), pita(3, 1.5), pita(4, 1), pita(5, 1), pita(6, 1.5),
  ]);
  assert.equal(proposal.proposed, 1);
  assert.equal(proposal.unit, "פיתות");
});

test("nothing is proposed from too few days, too few corrections or too small a difference", () => {
  // Five days is not a pattern, however consistent.
  assert.deepEqual(proposePortionChanges(Array.from({ length: 5 }, (_, i) => observation(i + 1, 50, 100))), []);
  // Nine days but only three corrections: the client mostly ate what was written.
  assert.deepEqual(proposePortionChanges([
    ...Array.from({ length: 3 }, (_, i) => observation(i + 1, 50, 100)),
    ...Array.from({ length: 6 }, (_, i) => observation(i + 4, null, 100)),
  ]), []);
  // Consistent, but a ten percent difference is a person being approximate.
  assert.deepEqual(proposePortionChanges(Array.from({ length: 8 }, (_, i) => observation(i + 1, 90, 100))), []);
});

test("the plan is judged against what was written most recently, not what it used to be", () => {
  // The coach rewrote the row from 200 to 100 mid-window; 100 is the live plan.
  const [proposal] = proposePortionChanges([
    observation(1, 50, 200), observation(2, 50, 200), observation(3, 50, 200),
    observation(4, 50, 100), observation(5, 50, 100), observation(6, 50, 100),
  ]);
  assert.equal(proposal.planned, 100);
  assert.equal(proposal.proposed, 50);
});

test("a meal that is refused most days is reported, and carries no rewrite with it", () => {
  const answers: readonly MealAnswer[] = [
    ...Array.from({ length: 6 }, (_, i) => ({ date: day(i + 1), mealId: "m1", mealTitle: "ארוחת בוקר", status: "not_eaten" as const })),
    ...Array.from({ length: 2 }, (_, i) => ({ date: day(i + 7), mealId: "m1", mealTitle: "ארוחת בוקר", status: "eaten" as const })),
  ];
  const [proposal] = proposeMissedMeals(answers);
  assert.equal(proposal.kind, "meal_missed");
  assert.equal(proposal.missed, 6);
  assert.equal(proposal.days, 8);
  // No proposed portion, no proposed target: this one is a conversation.
  assert.equal("proposed" in proposal, false);
  // Days nobody answered are not counted against the client.
  const withSilence = proposeMissedMeals([...answers, { date: day(9), mealId: "m1", mealTitle: "ארוחת בוקר", status: null }]);
  assert.equal(withSilence[0].days, 8);
});

const weights = (values: readonly number[]) =>
  values.map((value, index) => ({ date: day(index * 7 + 1), value }));

test("a target the scale disagrees with moves one step, in the direction the goal asks for", () => {
  // Four weigh-ins over 22 days, flat, against a loss goal.
  const stalled = proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 2000);
  assert.ok(stalled);
  assert.equal(stalled.proposed, 1850);
  assert.match(stalled.evidence.join(" "), /המשקל יורד/);

  // Losing fast enough that it will not hold: the target goes up.
  const crashing = proposeCalorieTarget(weights([80, 78.5, 77, 75.5]), "lose", 2000);
  assert.equal(crashing?.proposed, 2150);

  // Losing at a sensible rate says nothing at all, which is the common case.
  assert.equal(proposeCalorieTarget(weights([80, 79.5, 79, 78.5]), "lose", 2000), null);
});

test("a target never moves further than a tenth of itself", () => {
  // A tenth of 3000 is 300, which is wider than the step, so the step wins.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 3000)?.proposed, 2850);
  // A tenth of 1600 is 160, still wider than the step.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 1600)?.proposed, 1450);
  // A tenth of 1400 is 140, narrower than the step, so the bound wins.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 1400)?.proposed, 1260);
});

test("a cut that would land under the floor is left to the coach", () => {
  // 1250 - 125 is 1125, under the floor. Clamping it up to 1200 would answer
  // "you are not losing" with a bigger target, so nothing is proposed.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 1250), null);
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", 1000), null);
  // Raising from the same place is still fine.
  assert.equal(proposeCalorieTarget(weights([80, 78.5, 77, 75.5]), "lose", 1250)?.proposed, 1380);
});

test("the scale is not read until it has said something", () => {
  // Three weigh-ins is not enough however long the span.
  assert.equal(proposeCalorieTarget(weights([80, 80, 80]), "lose", 2000), null);
  // Four weigh-ins inside a week is not enough however many there are.
  const crowded = [0, 1, 2, 3].map((offset) => ({ date: day(offset + 1), value: 80 }));
  assert.equal(proposeCalorieTarget(crowded, "lose", 2000), null);
  // And with no target there is nothing to move.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 79.9, 80]), "lose", null), null);
});

test("holding steady is a goal too, and drifting either way corrects toward it", () => {
  assert.equal(proposeCalorieTarget(weights([80, 80.6, 81.2, 81.8]), "maintain", 2400)?.proposed, 2250);
  assert.equal(proposeCalorieTarget(weights([80, 79.4, 78.8, 78.2]), "maintain", 2400)?.proposed, 2550);
  // Half a kilo over three weeks is holding steady.
  assert.equal(proposeCalorieTarget(weights([80, 80.1, 80.2, 80.3]), "maintain", 2400), null);
});

test("a quiet fortnight proposes nothing, and says so in one line", () => {
  const nothing = buildNutritionProposals({
    observations: Array.from({ length: 9 }, (_, i) => observation(i + 1, null, 100)),
    answers: Array.from({ length: 9 }, (_, i) => ({ date: day(i + 1), mealId: "m1", mealTitle: "ארוחת בוקר", status: "eaten" as const })),
    weights: weights([80, 79.5, 79, 78.5]),
    goal: "lose",
    calorieTarget: 2000,
  });
  assert.deepEqual(nothing, []);
  assert.equal(summarizeProposals(nothing), "");
});

test("everything worth reading arrives together, target first", () => {
  const proposals = buildNutritionProposals({
    observations: Array.from({ length: 8 }, (_, i) => observation(i + 1, 50, 100)),
    answers: Array.from({ length: 8 }, (_, i) => ({ date: day(i + 1), mealId: "m1", mealTitle: "ארוחת בוקר", status: "not_eaten" as const })),
    weights: weights([80, 80.1, 79.9, 80]),
    goal: "lose",
    calorieTarget: 2000,
  });
  assert.deepEqual(proposals.map((item) => item.kind), ["calorie_target", "portion", "meal_missed"]);
  assert.equal(summarizeProposals(proposals), "יעד קלוריות · 1 כמויות · 1 ארוחות שלא נאכלות");
});

// The generator and the screens it feeds. Source assertions in the style the
// repository already uses for routes and policies: what matters here is that
// nothing reaches a client without a coach, and that the loop is not per-client.
test("proposals are coach-only drafts, generated in batch, and reachable", async () => {
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(new URL("../supabase/migrations/202608250012_nutrition_adaptation_proposals.sql", import.meta.url), "utf8");
  // Read by the owning coach and nobody else. No client policy exists at all.
  assert.match(sql, /create policy nutrition_proposals_coach_read[\s\S]*?public\.is_coach_for\(client_id\)/);
  assert.doesNotMatch(sql, /client_id = \(select auth\.uid\(\)\)/);
  // Approving is guarded on the coach owning this client, inside the function.
  assert.match(sql, /public\.current_role\(\) <> 'coach'/);
  assert.match(sql, /not public\.is_coach_for\(v\.client_id\)/);
  // A missed meal carries no change and cannot be approved into one.
  assert.match(sql, /if v\.kind = 'meal_missed' then[\s\S]*?p_decision <> 'acknowledge'/);
  // The conflict target is a plain column, which is what PostgREST can name.
  assert.match(sql, /group_key uuid not null generated always as/);

  const generator = await readFile(new URL("../lib/nutrition/adaptation-generator.ts", import.meta.url), "utf8");
  // One query per table for the whole roster, never one per client.
  assert.match(generator, /\.in\("client_id", clientIds\)/);
  assert.doesNotMatch(generator, /for \(const clientId of clientIds\)[\s\S]{0,400}await supabase\.from/);
  // A reviewed proposal is never revived by the next run.
  assert.match(generator, /ignoreDuplicates: true/);

  const action = await readFile(new URL("../app/actions/nutrition-proposals.ts", import.meta.url), "utf8");
  assert.match(action, /auth\.role !== "coach"/);
  assert.match(action, /review_nutrition_proposal/);

  const cron = await readFile(new URL("../app/api/cron/daily-coach/route.ts", import.meta.url), "utf8");
  // Runs from the evening slot, and one failure does not take the others down.
  assert.match(cron, /try\{nutritionProposals=await generateNutritionProposals\(supabase,date\)\}catch/);
});

test("a free-text goal is only read where it is unambiguous", async () => {
  const { readGoal } = await import("../lib/nutrition/adaptation-generator.ts");
  assert.equal(readGoal("gentle_cut", ""), "lose");
  assert.equal(readGoal("dirty_bulk", ""), "gain");
  assert.equal(readGoal("maintain", "ירידה במשקל"), "maintain");
  assert.equal(readGoal("", "ירידה במשקל"), "lose");
  assert.equal(readGoal("", "בניית מסה"), "gain");
  // Anything the app cannot read falls back to the goal that proposes least.
  assert.equal(readGoal("", "רוצה להרגיש טוב יותר"), "maintain");
});
