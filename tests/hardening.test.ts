import assert from "node:assert/strict";
import test from "node:test";
import { foodRepository, normalizeFoodText, queryFoods } from "../lib/foods/repository.ts";
import { calculateFoodNutrition } from "../lib/meal-plans/calculations.ts";
import { duplicateMealPlan } from "../lib/meal-plans/duplication.ts";
import { exampleMealPlans } from "../lib/meal-plans/mock-data.ts";
import { validateWeighIn } from "../lib/progress/validation.ts";
import { validateCheckIn } from "../lib/check-ins/validation.ts";
import { createMemoryAdapter } from "../lib/storage/demo-adapter.ts";
import type { DemoSnapshot } from "../lib/storage/types.ts";

test("Hebrew search normalization handles niqqud, punctuation, maqaf and whitespace", () => { assert.equal(normalizeFoodText("  גָּבִינָה־לבנה ״5%״  "), "גבינה לבנה 5%"); });
test("food search covers name, brand and category and preserves source", () => { const all = foodRepository.getAll(); const food = all[0]; for (const term of [food.name, food.brand!, food.category]) assert.ok(queryFoods(all, { search: term }).some((item) => item.id === food.id)); assert.equal(all.length, 336); });
test("quantity nutrition scales deterministically", () => { assert.deepEqual(calculateFoodNutrition({ calories: 200, protein: 10, carbs: 20, fat: 5 }, 250), { calories: 500, protein: 25, carbs: 50, fat: 12.5 }); });
test("menu duplication deeply replaces IDs and resets publication assignment", () => { const source = exampleMealPlans[0]; const copy = duplicateMealPlan(source, "copy", "2026-07-20"); assert.equal(copy.status, "draft"); assert.equal(copy.assignedClientId, undefined); assert.notEqual(copy.meals[0].id, source.meals[0].id); assert.notEqual(copy.meals[0].items[0].id, source.meals[0].items[0].id); assert.equal(copy.meals[0].items[0].foodId, source.meals[0].items[0].foodId); });
test("measurement validation rejects invalid numeric state", () => { assert.ok(validateWeighIn({ id: "x", clientId: "c", date: "bad", weightKg: Number.NaN, measurements: { waistCm: -1 } }).length >= 3); assert.deepEqual(validateWeighIn({ id: "x", clientId: "c", date: "2026-07-20", weightKg: 80, measurements: { waistCm: 90 } }), []); });
test("check-in validation enforces ranges", () => { const valid = { id: "x", clientId: "c", date: "2026-07-20", weightKg: 80, waistCm: 90, hunger: 3 as const, sleep: 4 as const, energy: 2 as const, trainingCompleted: false }; assert.deepEqual(validateCheckIn(valid), []); assert.ok(validateCheckIn({ ...valid, weightKg: 0, hunger: 8 as never }).length >= 2); });
test("memory adapter isolates writes and clears to the initial demo snapshot", () => { const initial: DemoSnapshot = { identity: { id: "demo", role: "client", demo: true }, profile: { fullName: "דמו", phone: "", targetWeightKg: 70 }, mealCompletions: {}, measurements: [], weightEntries: [], checkIns: [], preferences: { reminders: true, weeklySummary: true, compactMeals: false }, contentProgress: {}, coachNotes: [] }; const adapter = createMemoryAdapter(initial); adapter.save({ ...initial, preferences: { ...initial.preferences, reminders: false } }); assert.equal(adapter.load().preferences.reminders, false); adapter.clear(); assert.equal(adapter.load().preferences.reminders, true); });
