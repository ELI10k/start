import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { israelDateKey, israelWeekday } from "../lib/date-time.ts";
import { buildShoppingList, shoppingListText } from "../lib/nutrition/shopping-list.ts";
import { GROUP_CALORIE_SHARE, MEAL_CALORIE_SHARE, portionForCalories } from "../lib/nutrition/meal-alternatives.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The changes from the product review, pinned. Each of these is a thing that was
// wrong or missing and could quietly come back.

// ─── א-1 the day the client is actually living in ──────────────────────────

test("today is the Israeli calendar day, not the UTC one", () => {
  // 00:30 on 20 August, Israel time, is 21:30 on the 19th in UTC. The screens
  // used to read the UTC day, so between midnight and 03:00 a client saw
  // yesterday's meals - already marked.
  const justAfterMidnightIsrael = new Date("2026-08-19T21:30:00.000Z");
  assert.equal(israelDateKey(justAfterMidnightIsrael), "2026-08-20");
  assert.notEqual(israelDateKey(justAfterMidnightIsrael), justAfterMidnightIsrael.toISOString().slice(0, 10));
});

test("the weekday is resolved in Israel time too", () => {
  // 2026-08-20 is a Thursday; Sunday is 0, so Thursday is 4.
  assert.equal(israelWeekday("2026-08-20"), 4);
});

test("no client screen computes the day from toISOString", async () => {
  for (const path of ["app/page.tsx", "app/nutrition/page.tsx", "app/profile/page.tsx"]) {
    const text = await source(path);
    assert.doesNotMatch(text, /new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/, path);
    assert.match(text, /israelDateKey\(\)/, path);
  }
});

// ─── ב-1 the coach's work is not held only in a tab ───────────────────────

test("the menu editor guards the exit, mirrors a draft, and says where the work is", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  assert.match(editor, /beforeunload/);
  assert.match(editor, /localStorage\.setItem\(draftKey/);
  assert.match(editor, /localStorage\.removeItem\(draftKey\)/);
  // Restoring is offered, never applied: the server copy may be the newer one.
  assert.match(editor, /שחזור הטיוטה/);
  assert.match(editor, /data-testid="save-state"/);
});

// ─── ב-3 a first draft that aims at the target ────────────────────────────

test("a calorie budget produces a portion, and the shares cover the day", () => {
  // 100 g of a 250 kcal/100 g food is 250 kcal, so a 500 kcal budget is 200 g.
  const food = { calories: 250, protein: 10, carbs: 20, fat: 5, packageUnit: null, unitWeightGrams: null };
  const portion = portionForCalories(food, 500);
  assert.ok(portion);
  assert.equal(portion.quantity, 200);
  assert.equal(portion.unit, "גרם");
  // A budget that cannot be met is refused rather than guessed at.
  assert.equal(portionForCalories(food, 0), null);
  assert.equal(portionForCalories({ ...food, calories: 0 }, 500), null);

  const dayShare = Object.values(MEAL_CALORIE_SHARE).reduce((sum, value) => sum + value, 0);
  assert.equal(Math.round(dayShare * 100), 100);
  // Vegetables are an addition to the plate, not a measured portion.
  assert.equal(GROUP_CALORIE_SHARE.vegetables, 0);
});

// ─── ב-5 more than one day per menu ───────────────────────────────────────

test("the editor saves the days it holds, not a hardcoded single day", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  assert.match(editor, /days:savedDays\(\)\.map/);
  assert.doesNotMatch(editor, /days:\[\{dayIndex:0,title:"יום רגיל"/);
  // Day 0 is the fallback for every weekday without one, so it cannot be removed.
  assert.match(editor, /if\(dayIndex===0\)return;/);
});

test("reopening a menu returns every group and the primary marks", async () => {
  const route = await source("app/coach/menus/[id]/page.tsx");
  // It used to rebuild protein and carbohydrate only, so a saved fat portion and
  // the vegetables vanished on reload - and saving again deleted them for real.
  assert.match(route, /GROUP_TYPES=\["protein","carbohydrate","fat","vegetables"\]/);
  assert.match(route, /item_role\?item\.item_role==="primary":index===0/);
  assert.match(route, /note:item\.note\?\?""/);
});

// ─── ד-1 "I ate something else" ───────────────────────────────────────────

test("a substitution is recorded, and never counted as intake", async () => {
  const migration = await source("supabase/migrations/202608190002_meal_substituted_status.sql");
  assert.match(migration, /check \(status in \('eaten', 'not_eaten', 'other'\)\)/);
  // A substitution with no description says only that the plan was missed, which
  // is the old "not eaten" under a new name.
  assert.match(migration, /substitution_requires_note/);
  assert.match(migration, /note_requires_other_status/);
  // The planned items are deleted for 'other' as well - they are not what was
  // eaten, and free text has no approved nutrition values.
  assert.match(migration, /'not_eaten', 'other' and 'none' all remove any recorded intake/);
});

// ─── ה-1, ה-2 the workout in a real gym ───────────────────────────────────

test("the rest timer is audible, and the sets open with last time's numbers", async () => {
  const [session, feedback] = await Promise.all([
    source("components/workouts/client/WorkoutSession.tsx"),
    source("lib/workouts/feedback.ts"),
  ]);
  assert.match(feedback, /navigator\.vibrate/);
  assert.match(feedback, /AudioContext/);
  assert.match(session, /signalRestOver/);
  // Scheduled against the rest end rather than polled off the ticking clock.
  assert.match(session, /setTimeout\(signalRestOver,remaining\)/);

  assert.match(session, /weightKg:previous\?\.weightKg,repetitions:previous\?\.repetitions/);
  // Prefilled, but still confirmed: nothing is recorded that was not tapped.
  assert.match(session, /order:index,completed:false,/);
});

test("leaving a workout can keep what was done", async () => {
  const session = await source("components/workouts/client/WorkoutSession.tsx");
  assert.match(session, /שמירת מה שבוצע וסיום/);
  assert.match(session, /מחיקת האימון וכל הסטים שנרשמו/);
});

// ─── ה-4 a swap is not a skip ─────────────────────────────────────────────

test("a substituted exercise keeps the prescribed one on the row", async () => {
  const migration = await source("supabase/migrations/202608190004_substituted_exercise.sql");
  assert.match(migration, /add column if not exists performed_exercise_id/);
  // The integrity rules are untouched: exercise_id is still the prescribed one,
  // so both the trigger and the in-function check still pass.
  assert.match(migration, /invalid_workout_exercise/);
  assert.match(migration, /session_not_owned/);
  assert.match(migration, /assignment_not_active/);
});

// ─── ו-1 the direct channel ───────────────────────────────────────────────

test("neither side of a message can name the other", async () => {
  const migration = await source("supabase/migrations/202608190001_coach_client_messages.sql");
  // A client names nobody; a coach names only the client and is checked against
  // the relationship. The sender is always auth.uid().
  assert.match(migration, /v_client_id := auth\.uid\(\)/);
  assert.match(migration, /if not public\.is_coach_for\(p_client_id\) then raise exception 'not_authorized'/);
  assert.match(migration, /sender_id\) *values|values \(v_coach_id, v_client_id, auth\.uid\(\)/);
  // No insert policy exists: writing goes through the function or not at all.
  assert.doesNotMatch(migration, /for insert to authenticated/);
});

test("a message from a coach is not silenced by a category toggle", async () => {
  const migration = await source("supabase/migrations/202608190001_coach_client_messages.sql");
  assert.match(migration, /'system', 'direct_message'/);
});

test("the screens survive the window before the migration is applied", async () => {
  const repository = await source("lib/messages/repository.ts");
  assert.match(repository, /42P01/);
  assert.match(repository, /PGRST205/);
});

// ─── ד-5 the list you carry round a supermarket ───────────────────────────

test("the shopping list sums per unit and never converts between them", () => {
  const lines = buildShoppingList([
    { name: "חזה עוף", displayQuantity: 150, measurementUnit: "גרם", itemRole: "primary" },
    { name: "חזה עוף", displayQuantity: 120, measurementUnit: "גרם", itemRole: "primary" },
    { name: "פיתה", displayQuantity: 1, measurementUnit: "יחידות", itemRole: "primary" },
    { name: "פיתה", displayQuantity: 1.5, measurementUnit: "יחידות", itemRole: "alternative" },
    { name: "קוטג׳", displayQuantity: 200, measurementUnit: "גרם", itemRole: "alternative" },
  ]);

  const chicken = lines.find((line) => line.name === "חזה עוף");
  assert.deepEqual(chicken, { name: "חזה עוף", quantity: 270, unit: "גרם", alternativeOnly: false });

  // Same food, both a countable unit and a mass, stays two lines - START does not
  // invent the conversion between them.
  const pitta = lines.filter((line) => line.name === "פיתה");
  assert.equal(pitta.length, 1);
  assert.equal(pitta[0].quantity, 2.5);

  // A food that only ever appears as a swap is still on the list - one you have
  // not bought is not a choice - but it is marked and sorted after the plan.
  const cottage = lines.find((line) => line.name === "קוטג׳");
  assert.equal(cottage?.alternativeOnly, true);
  assert.equal(lines.at(-1)?.name, "קוטג׳");

  const text = shoppingListText(lines, "תפריט 1800");
  assert.match(text, /רשימת קניות · תפריט 1800/);
  assert.match(text, /חלופות:/);
});

test("a zero or negative quantity is dropped rather than printed", () => {
  const lines = buildShoppingList([
    { name: "אפס", displayQuantity: 0, measurementUnit: "גרם", itemRole: "primary" },
    { name: "ריק", displayQuantity: Number.NaN, measurementUnit: "גרם", itemRole: "primary" },
    { name: "  ", displayQuantity: 100, measurementUnit: "גרם", itemRole: "primary" },
  ]);
  assert.deepEqual(lines, []);
});

// ─── ז-1, ז-2 the shape of the app ────────────────────────────────────────

test("the bottom bar is five tabs, and notifications are not in two places", async () => {
  const nav = await source("components/BottomNav.tsx");
  const hrefs = [...nav.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, ["/", "/nutrition", "/workouts", "/progress", "/profile"]);
  // The bell in the header is the one place notifications live.
  assert.doesNotMatch(nav, /"\/notifications"/);
});

test("the pre-Supabase client screens are gone, mock data and all", async () => {
  for (const path of [
    "components/client/ClientDashboard.tsx",
    "components/client/ClientNutrition.tsx",
    "components/coach/menus/MealPlanEditor.tsx",
    "components/coach/ClientsDirectory.tsx",
  ]) {
    await assert.rejects(source(path), `${path} is still present`);
  }
});

// ─── the client validator has to agree with the database ──────────────────

test("every group type the database accepts is accepted before the request", async () => {
  const [validation, migration] = await Promise.all([
    source("lib/nutrition/menu-validation.ts"),
    source("supabase/migrations/202608180004_menu_item_notes_and_groups.sql"),
  ]);
  // 202608180004 widened save_meal_plan_tree to fat and vegetables. The browser
  // validator was left on the old pair, so it rejected menus the server would
  // have taken - and it rejected them without a request, which is the worst
  // place to disagree.
  for (const type of ["protein", "carbohydrate", "fat", "vegetables"]) {
    assert.match(migration, new RegExp(`'${type}'`), `the database no longer accepts ${type}`);
    assert.match(validation, new RegExp(`"${type}"`), `the validator does not accept ${type}`);
  }
});

// ─── a refusal has to be visible from where the button is ─────────────────

test("the save result lives inside the sticky bar, and a refusal reads as one", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  // The save control is sticky. The message was not, so pressing save after
  // scrolling through six meals put the refusal above the viewport and the coach
  // saw nothing happen - with the menu unsaved.
  const stickyStart = editor.indexOf("sticky top-0");
  const messageAt = editor.indexOf('role={messageTone==="error"?"alert":"status"}');
  const stickyEnd = editor.indexOf("{/* A draft found on this device");
  assert.ok(stickyStart >= 0 && messageAt > stickyStart && messageAt < stickyEnd,
    "the save message is not rendered inside the sticky bar");

  // A failure and a success must not look the same.
  assert.match(editor, /messageTone==="error"\?"alert":"status"/);
  assert.match(editor, /border-\[#DC2626\]\/40 bg-\[#FEF2F2\]/);

  // The one combination the server refuses outright is refused here first,
  // rather than after a whole menu has been built.
  assert.match(editor, /const activeWithoutClient=menu\.status==="active"&&!menu\.clientId/);
  // And it points at the status that does what the coach wanted. "פעיל" was
  // being read as "ready", so a coach building a bank of menus reached for it.
  assert.match(editor, /מוכן בבנק/);
});

