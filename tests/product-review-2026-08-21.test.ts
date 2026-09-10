import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addTotals,
  eatenFromMenu,
  isMealAnswered,
  isMealEaten,
  mealStanding,
  remainingInMenu,
  sumItems,
  type IntakeMeal,
} from "../lib/nutrition/menu-intake.ts";
import { sumLoggedFood, type LoggedFood } from "../lib/nutrition/food-log.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const item = (id: string, calories: number, role: "primary" | "alternative" = "primary") =>
  ({ id, itemRole: role, calories, protein: calories / 10, carbs: 0, fat: 0 }) as const;

const meal = (over: Partial<IntakeMeal> = {}): IntakeMeal => ({
  status: null,
  completed: false,
  groups: [{ items: [item("a", 300), item("b", 200, "alternative")], selectedItemId: "a" }],
  ...over,
});

// ------------------------------------------------------- one rule for one day

test("a meal stands at its chosen alternative, and at the primary before a choice", () => {
  assert.deepEqual(mealStanding(meal()).map((row) => row.id), ["a"]);
  assert.deepEqual(mealStanding(meal({ groups: [{ items: [item("a", 300), item("b", 200, "alternative")] }] })).map((row) => row.id), ["a"]);
  // Chosen wins even when it is an alternative - that is what choosing it means.
  const chosenAlternative = meal({ groups: [{ items: [item("a", 300), item("b", 200, "alternative")], selectedItemId: "b" }] });
  assert.deepEqual(mealStanding(chosenAlternative).map((row) => row.id), ["b"]);
});

test("answered and eaten are different questions", () => {
  assert.equal(isMealEaten(meal({ status: "eaten" })), true);
  assert.equal(isMealEaten(meal({ completed: true })), true);
  // Skipped and substituted are answers, and neither is intake.
  for (const status of ["not_eaten", "other"] as const) {
    assert.equal(isMealEaten(meal({ status })), false, status);
    assert.equal(isMealAnswered(meal({ status })), true, status);
  }
  assert.equal(isMealAnswered(meal()), false);
});

test("a meal that was answered is neither eaten nor still to come", () => {
  const day = [meal({ status: "eaten" }), meal({ status: "not_eaten" }), meal()];
  assert.equal(eatenFromMenu(day).calories, 300);
  assert.equal(remainingInMenu(day).calories, 300);
});

test("logged food joins the day's totals, and the unmeasured part does not", () => {
  const logged: LoggedFood[] = [
    { id: "1", mealId: null, name: "שוקו", quantity: 250, unit: "מ״ל", calories: 180, protein: 6, carbs: 24, fat: 5, source: "scan", photoUrl: null },
    { id: "2", mealId: null, name: "משהו בעבודה", quantity: null, unit: null, calories: null, protein: null, carbs: null, fat: null, source: "text", photoUrl: null },
  ];
  const totals = sumLoggedFood(logged);
  assert.equal(totals.calories, 180);
  assert.equal(totals.unmeasured, 1);
  assert.equal(addTotals(sumItems(mealStanding(meal())), totals).calories, 480);
});

// --------------------------------------------- the three screens read one day

test("the dashboard, the nutrition screen and the client file share one rule", async () => {
  const [dashboard, nutrition, repository] = await Promise.all([
    source("app/page.tsx"),
    source("app/nutrition/page.tsx"),
    source("lib/data/product-repository.ts"),
  ]);
  // meal.items is every row the coach wrote, at the coach's portion - the
  // alternatives included. Only the group's chosen row carries the amount the
  // client reported eating, so a total built from meal.items ignores both
  // "I ate half" and every scanned item.
  for (const [name, text] of [["dashboard", dashboard], ["nutrition", nutrition], ["repository", repository]] as const) {
    assert.match(text, /menu-intake/, `${name} does not use the shared rule`);
  }
  assert.doesNotMatch(dashboard, /meals\.flatMap\(\(meal\) => meal\.items\)/);
  assert.doesNotMatch(repository, /menu\?\.meals\.flatMap\(\(meal\) => meal\.items\.filter\(\(item\) => item\.eaten\)\)/);
  // All three add what was logged beside the plan.
  for (const text of [dashboard, nutrition, repository]) assert.match(text, /sumLoggedFood/);
});

test("both sides count the same training week", async () => {
  const repository = await source("lib/data/product-repository.ts");
  // The client dashboard counts from Sunday through weekStart(); the coach's
  // file counted a rolling seven days, so on a Wednesday the two disagreed
  // about one client's week.
  assert.match(repository, /const weekOpened = new Date\(weekStart\(date\)\)\.getTime\(\)/);
  assert.doesNotMatch(repository, /6 \* 24 \* 60 \* 60 \* 1000/);
});

// ------------------------------------------------------------ recorded intake

test("intake is recorded at the portion the client reported", async () => {
  const migration = await source("supabase/migrations/202608210001_intake_follows_the_client.sql");
  // The factor is the reported amount over the prescribed one, in the unit the
  // client is shown.
  assert.match(migration, /create or replace function public\.meal_item_intake_factor/);
  assert.match(migration, /p_override \/ coalesce\(nullif\(p_display_quantity, 0\), p_amount\)/);
  // Zero is an answer - "it was served and I left it" - and eaten_meal_items
  // constrains amount to be positive, so the row is not written at all.
  assert.match(migration, /round\(i\.amount \* factor\.value, 2\) > 0/);
  // Every sentence that can change what "I ate this much of that" means has to
  // rewrite the record.
  for (const fn of ["set_meal_day_status", "set_meal_group_amount", "select_meal_group_alternative"])
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`), fn);
  assert.ok((migration.match(/refresh_meal_intake\(/g)?.length ?? 0) >= 4);
  // An override is a quantity of one food in that food's own unit; choosing a
  // different food has to drop it rather than reinterpret it.
  assert.match(migration, /amount_override=case when meal_group_selections\.meal_item_id is distinct from excluded\.meal_item_id/);
});

test("logging a food never erases an answer the client already gave", async () => {
  const action = await source("app/actions/food-log.ts");
  // set_meal_day_status('other') deletes the meal's recorded intake, so calling
  // it against a meal already marked eaten cost the day a whole meal - as a
  // side effect of logging an extra snack against it.
  assert.match(action, /if \(!isFreeCalorieMeal && !existing\)/);
  assert.match(action, /from\("meal_day_status"\)/);
  // A free-calorie window has no plan to have eaten instead of.
  assert.match(action, /free_calorie_target/);
});

// ------------------------------------------------------------------- the bell

test("one unread message counts once", async () => {
  const shell = await source("components/client/ClientShell.tsx");
  const bar = await source("components/BottomNav.tsx");
  // A direct message writes a message row AND a notification pointing at it, so
  // adding the two counts every message twice. Since the bar's badge moved to
  // the notifications tab it opens the same screen the bell does, so it is
  // handed the bell's own figure and there is nothing left to add up.
  // The figure is now asked for by the browser rather than awaited in front of
  // every client screen, so the shell counts nothing at all - but there is
  // still exactly one place it comes from, and it is still the count of the
  // screen the bell and the tab both open.
  assert.doesNotMatch(shell, /getUnreadMessageCount/);
  assert.doesNotMatch(shell, /getUnreadNotificationCount/);
  assert.match(bar, /const isInbox = href === "\/notifications";/);
  const badge = await source("components/notifications/UnreadNotificationBadge.tsx");
  assert.match(badge, /\/api\/notifications\/unread/);
  // revalidatePath cannot reach a client component, so the badge re-asks on
  // every navigation - which is when the server-rendered figure used to change.
  assert.match(badge, /\}, \[pathname\]\)/);
});

test("counting unread notifications does not fetch a page of them", async () => {
  const repository = await source("lib/notifications/repository.ts");
  assert.match(repository, /count: "exact", head: true/);
  // It is called on every render of the client shell and the coach navigation.
  assert.doesNotMatch(repository, /export async function getUnreadNotificationCount\(\)\s*\{\s*const center = await getNotificationCenter/);
  // Reminders still get generated on arrival.
  assert.match(repository, /ensure_in_app_reminders/);
});

test("reading a thread clears the bell entry it raised", async () => {
  const migration = await source("supabase/migrations/202608210002_reading_a_thread_clears_its_bell.sql");
  assert.match(migration, /update public\.notifications n/);
  assert.match(migration, /n\.source_table = 'coach_client_messages'/);
  // Only ever the caller's own rows.
  assert.match(migration, /n\.recipient_id = auth\.uid\(\)/);
});

// ------------------------------------------------------------ waiting on a person

test("a thread stays on the coach's dashboard until it is answered", async () => {
  const [dashboard, repository, types] = await Promise.all([
    source("app/coach/page.tsx"),
    source("lib/messages/repository.ts"),
    source("lib/messages/types.ts"),
  ]);
  // Reading a message answers "have I seen this", not "have I replied" - and
  // the panel filtered on unread, so opening a thread removed it from the list
  // of things to do.
  assert.match(types, /awaitingReply: boolean/);
  assert.match(repository, /awaitingReply: row\.sender_id !== user\.id/);
  assert.match(dashboard, /threads\.filter\(\(thread\) => thread\.awaitingReply\)/);
  assert.doesNotMatch(dashboard, /threads\.filter\(\(thread\) => thread\.unread > 0\)/);
});

// ------------------------------------------------------------------ refusals

test("notification preferences refuse in a sentence rather than an error screen", async () => {
  const [action, form] = await Promise.all([
    source("app/actions/notifications.ts"),
    source("components/notifications/NotificationPreferencesForm.tsx"),
  ]);
  // Two time fields that accept any time, and a rule between them. Throwing
  // took the notifications screen down.
  assert.doesNotMatch(action, /throw new Error\("invalid_workout_reminder_times"\)/);
  assert.doesNotMatch(action, /throw new Error\("invalid_meal_reminder_delay"\)/);
  assert.match(action, /שעת תזכורת הבוקר חייבת להיות מוקדמת משעת הערב/);
  assert.match(form, /useActionState\(saveNotificationPreferences/);
  assert.match(form, /role=\{state\.ok \? "status" : "alert"\}/);
});

// ------------------------------------------------------------------- wording

test("a free-calorie window is not asked what was eaten instead", async () => {
  const [sheet, frame] = await Promise.all([
    source("components/client/AteSomethingElse.tsx"),
    source("components/client/FreeCalorieMeal.tsx"),
  ]);
  assert.match(sheet, /title = "מה אכלת במקום\?"/);
  assert.match(frame, /title="מה אכלת במסגרת הזו\?"/);
});
