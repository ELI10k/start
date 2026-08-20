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

test("the totals and the save sit in one bar at the bottom, and a refusal reads as one", async () => {
  const [editor, css] = await Promise.all([
    source("components/coach/menus/PersistentMenuEditor.tsx"),
    source("app/globals.css"),
  ]);
  // The save button was in a sticky header and the totals in a sidebar that
  // stacks below six meals on anything under 2xl, so building a menu meant
  // scrolling to the top after every change to ask "am I near the target?" -
  // and a refusal rendered up there too, out of sight, which is how a menu was
  // lost. Both now live in one fixed bar at the bottom.
  const dockAt = editor.indexOf('className="menu-dock"');
  const messageAt = editor.indexOf('role={messageTone==="error"?"alert":"status"}');
  const dockEnd = editor.indexOf("<BottomSheet open={confirmActivation}");
  assert.ok(dockAt >= 0 && messageAt > dockAt && messageAt < dockEnd,
    "the save message is not rendered inside the bottom dock");
  assert.match(editor, /<DockTotal label="קלוריות"/);
  assert.match(css, /\.menu-dock \{[^}]*position: fixed/);
  // The bar covers the end of the page, so the page has to end above it.
  assert.match(css, /\.menu-editor \{ padding-bottom/);

  // A failure and a success must not look the same.
  assert.match(editor, /messageTone==="error"\?"alert":"status"/);
  assert.match(css, /\.menu-dock__message--error/);

  // The one combination the server refuses outright is refused here first,
  // rather than after a whole menu has been built.
  assert.match(editor, /const activeWithoutClient=menu\.status==="active"&&!menu\.clientId/);
  assert.match(editor, /מוכן בבנק/);
});


// ─── the record has to be a record of the same thing ──────────────────────

test("the personal best is compared within the rep range", async () => {
  const { bestComparableSet, targetRepetitions } = await import("../lib/workouts/progress.ts");
  const sessions = [{ sets: [
    { id: "a", order: 0, completed: true, weightKg: 60, repetitions: 12 },
    { id: "b", order: 1, completed: true, weightKg: 50, repetitions: 10 },
    { id: "c", order: 2, completed: true, weightKg: 52.5, repetitions: 9 },
    { id: "d", order: 3, completed: false, weightKg: 90, repetitions: 10 },
  ] }];
  // Working at 10: the 60 kg twelve is a different effort and is not the
  // benchmark. The 90 was never completed, so it is not a record of anything.
  assert.deepEqual(bestComparableSet(sessions, 10), { weightKg: 52.5, repetitions: 9 });
  // Working at 12, the 60 is exactly the right comparison.
  assert.equal(bestComparableSet(sessions, 12)?.weightKg, 60);
  // Nothing comparable is answered with nothing, not with the heaviest available.
  assert.equal(bestComparableSet(sessions, 3), null);
  assert.equal(bestComparableSet([{ sets: [] }], 10), null);

  assert.equal(targetRepetitions("10"), 10);
  assert.equal(targetRepetitions("8-12"), 10);
  assert.equal(targetRepetitions(undefined), undefined);
});

test("the warm-up and the household reading are on the screens that need them", async () => {
  const [session, option, nutrition] = await Promise.all([
    source("components/workouts/client/WorkoutSession.tsx"),
    source("components/client/MealOptionButton.tsx"),
    source("app/nutrition/page.tsx"),
  ]);
  assert.match(session, /planWarmup\(workingWeightFrom\(performance\.sessions\)/);
  assert.match(session, /compound:isCompoundLift\(exercise\?\.name\)/);
  // Warm-up sets are guidance, not logged work - they must not reach the volume.
  assert.match(session, /סטי החימום אינם נרשמים ואינם נספרים בנפח/);

  assert.match(option, /household\?: string/);
  // The meal is part of the reading now: the spoon rule is a lunch rule, and a
  // spoon count printed on breakfast cereal is a number nobody asked for.
  assert.match(nutrition, /householdMeasure\(item\.amount,group\.type,item\.measurementUnit,meal\.title\)/);
});

// ─── one blank row made a whole menu unsavable ────────────────────────────

test("an unfilled alternative slot is dropped, not sent", async () => {
  const { validateMealPlanPayload } = await import("../lib/nutrition/menu-validation.ts");
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");

  // "הוספת חלופה" creates a blank row. The editor created it, so leaving it
  // unfilled is an unused slot rather than a mistake - but it used to travel to
  // the server, which refused the entire menu over it.
  const withBlank = {
    title: "תפריט", status: "published", clientId: "",
    days: [{ meals: [{ title: "ארוחת בוקר", groups: [
      { type: "protein", items: [{ foodId: "food-1", amount: 200 }, { foodId: "", amount: 100 }] },
    ] }] }],
  };
  const refused = validateMealPlanPayload(withBlank);
  assert.equal(refused.ok, false);
  assert.match(refused.ok === false ? refused.message : "", /יש לבחור מזון בכל חלופה/);

  // The same menu with the blank row dropped is exactly what the editor now
  // sends, and it is accepted.
  const cleaned = {
    ...withBlank,
    days: [{ meals: [{ title: "ארוחת בוקר", groups: [
      { type: "protein", items: [{ foodId: "food-1", amount: 200 }] },
    ] }] }],
  };
  assert.equal(validateMealPlanPayload(cleaned).ok, true);

  // Blank rows first, then groups left with nothing, then meals left with no
  // groups - in that order, or an emptied group survives as an empty one.
  assert.match(editor, /items:group\.items\.filter\(item=>item\.foodId&&Number\(item\.amount\)>0\)/);
  assert.match(editor, /\.filter\(group=>group\.items\.length\)/);
});

// ─── what the session just said, and what to do with it ───────────────────

test("the workout report reads off what was recorded, and never fills space", async () => {
  const { buildWorkoutReport, expectedSeconds } = await import("../lib/workouts/session-report.ts");
  const set = (id: string, weightKg: number, completed = true) =>
    ({ id, order: 0, completed, weightKg, repetitions: 10 });

  // Every set completed at last session's weight is the one thing a report
  // should always say: you are ready for more.
  const ready = buildWorkoutReport({
    durationSeconds: 600,
    exercises: [{ name: "לחיצת חזה", restSeconds: 60, skipped: false,
      sets: [set("a", 60), set("b", 60)], previousSets: [set("x", 60)] }],
  });
  assert.ok(ready.some((item) => item.title === "אפשר לעלות במשקל"));

  // Beating it is praised, with both numbers.
  const improved = buildWorkoutReport({
    durationSeconds: 600,
    exercises: [{ name: "סקוואט", restSeconds: 60, skipped: false,
      sets: [set("a", 70)], previousSets: [set("x", 60)] }],
  });
  assert.ok(improved.some((item) => item.tone === "praise" && /60 → 70/.test(item.detail)));

  // A session that ran long is stated with its own arithmetic rather than an
  // accusation the data cannot support.
  const slow = buildWorkoutReport({
    durationSeconds: 60 * 60,
    exercises: [{ name: "חתירה", restSeconds: 60, skipped: false,
      sets: [set("a", 40), set("b", 40)], previousSets: [] }],
  });
  const pace = slow.find((item) => item.title === "האימון נמשך יותר מהצפוי");
  assert.ok(pace);
  assert.doesNotMatch(pace!.detail, /טלפון|רשתות|מסך/);
  assert.equal(expectedSeconds([{ name: "x", restSeconds: 60, skipped: false, sets: [set("a", 40)], previousSets: [] }]), 105);

  // Nothing notable produces one honest line, not an empty panel and not an
  // invented observation.
  const quiet = buildWorkoutReport({
    durationSeconds: 300,
    exercises: [{ name: "כפיפות", restSeconds: 60, skipped: false, sets: [set("a", 20)], previousSets: [] }],
  });
  assert.equal(quiet.length, 1);
  assert.equal(quiet[0].tone, "praise");
});
