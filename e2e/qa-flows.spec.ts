import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

// The two client journeys the rest of the suite only touches at the edges:
// marking a meal eaten, and running a workout session far enough to log a set.
//
// Both restore what they change - the meal is unmarked, the session cancelled -
// so a run leaves no residue on the shared test account.

test.describe("client flows", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("choosing an alternative in every group unlocks marking the meal eaten", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/nutrition");

    // The first meal that has food groups - the free-calorie meal has none.
    const meal = page.locator("article").filter({ has: page.locator("fieldset") }).first();
    if (!(await meal.count())) test.skip(true, "no grouped meal on the assigned menu today");

    // Until every group has a choice, the screen states the condition instead of
    // offering a button that the database would refuse.
    const groups = meal.locator("fieldset");
    for (let index = 0; index < (await groups.count()); index += 1) {
      await groups.nth(index).getByRole("button").first().click();
      await page.waitForLoadState("networkidle");
    }

    const mark = meal.getByRole("button", { name: "סימון הארוחה כנאכלה" });
    await expect(mark).toBeVisible({ timeout: 20_000 });
    await mark.click();

    const undo = meal.getByRole("button", { name: "ביטול השלמה" });
    await expect(undo).toBeVisible({ timeout: 20_000 });

    // Put the day back the way it was found.
    await undo.click();
    await expect(meal.getByRole("button", { name: "סימון הארוחה כנאכלה" })).toBeVisible({ timeout: 20_000 });
  });

  test("a workout session starts, logs a set and cancels cleanly", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/workouts");

    // The workout snapshot loads client-side, so the screen shows skeletons first.
    // Counting before it settles reports "no programme" for a client who has one.
    const start = page.getByRole("link", { name: /התחלת אימון|המשך אימון/ }).first();
    const empty = page.getByText("אין תוכנית אימון משויכת");
    await expect(start.or(empty)).toBeVisible({ timeout: 30_000 });
    if (await empty.isVisible()) test.skip(true, "no active programme assigned to the test client");

    await start.click();
    await page.waitForURL(/\/workouts\/[^/]+\/[^/]+$/);

    // A fresh session opens on the start card; an interrupted one opens straight
    // into the exercise. The start card is server-rendered but only works once the
    // client component hydrates, and a click that lands first is swallowed - so
    // press until the session actually opens.
    const begin = page.getByRole("button", { name: "התחלת אימון" });
    const next = page.getByRole("button", { name: "הבא" });
    await expect(async () => {
      if (await begin.isVisible().catch(() => false)) await begin.click();
      await expect(next).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000, intervals: [500, 1_000, 2_000] });

    // A programme can open on a row with no prescribed sets - the source
    // workbooks start several days with a dynamic warm-up. Step forward until
    // there is something to log.
    const weight = page.getByRole("spinbutton", { name: /משקל בסט 1/ });
    await expect(async () => {
      if (!(await weight.isVisible().catch(() => false))) {
        await next.click();
        throw new Error("no sets on this exercise yet");
      }
    }).toPass({ timeout: 60_000, intervals: [500, 1_000] });
    await weight.fill("40");
    await page.getByRole("spinbutton", { name: /חזרות בסט 1/ }).fill("10");

    const done = page.getByRole("button", { name: /^השלמת סט 1$/ });
    await done.click();
    await expect(page.getByRole("button", { name: /ביטול השלמת סט 1/ })).toBeVisible({ timeout: 20_000 });

    // The sticky bar counts the logged set.
    await expect(page.locator(".session-sticky")).toContainText("סטים");

    // Cancel through the sheet, so nothing is saved to history.
    await page.getByRole("button", { name: "ביטול האימון" }).click();
    const sheet = page.getByRole("dialog", { name: "לבטל את האימון הפעיל?" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "ביטול האימון ומחיקת הנתונים" }).click();

    await expect(page.getByRole("button", { name: "התחלת אימון" })).toBeVisible({ timeout: 30_000 });
  });
});
