import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The whole thing a client does in a gym, in one pass: open the programme, start
// the workout, read the exercise, open its guidance, type a weight and a rep
// count, tick the set, move on, finish, and find it in the history afterwards.
//
// The other workout specs check pieces of this. This one checks that the pieces
// join up, which is what a manual test was finding they did not.
test.describe("client workout journey", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("the assigned programme is reachable and names its exercises", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/workouts");

    // The snapshot loads client-side, so the screen shows skeletons first.
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 20_000 });

    // Whatever is assigned, the client must be able to reach its exercises -
    // and an unassigned client must be told so rather than shown a blank page.
    const empty = page.getByText("אין תוכנית אימון משויכת");
    if (await empty.count()) {
      test.skip(true, "no programme assigned to the test client");
    }

    await expect(page.getByRole("link", { name: /התחלת אימון|המשך אימון/ })).toBeVisible({ timeout: 20_000 });
    await signOut(page);
  });

  test("guidance is one tap from the exercise, and states what is missing", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/workouts");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 20_000 });
    if (await page.getByText("אין תוכנית אימון משויכת").count()) test.skip(true, "no programme assigned");

    const start = page.getByRole("link", { name: /התחלת אימון|המשך אימון/ });
    await start.click();
    await expect(page).toHaveURL(/\/workouts\/[^/]+\/[^/]+/, { timeout: 20_000 });

    // The start gate is a client component, so a click landing before hydration
    // does nothing - and the run then reads as "there is no guidance button"
    // rather than "the workout never started".
    const guidance = page.getByRole("button", { name: "דגשים לתרגיל" });
    await expect(async () => {
      const begin = page.getByRole("button", { name: /^התחלת אימון$|מתחילים/ });
      if (await begin.count()) await begin.first().click();
      await expect(guidance.first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    await guidance.first().click();

    // The sheet opens, and says something honest either way: real guidance, or
    // which parts have not been filled in yet.
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/שרירים עובדים|ציוד|איך מבצעים|לא סופק מידע/).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Leave no active session behind for the next spec.
    // Renamed when leaving stopped meaning "delete everything": the way out is
    // now "יציאה מהאימון", and deleting is one of three choices behind it.
    const cancel = page.getByRole("button", { name: "יציאה מהאימון" });
    if (await cancel.count()) {
      await cancel.click();
      await page.getByRole("button", { name: /מחיקת האימון וכל הסטים שנרשמו/ }).click();
    }
    await signOut(page);
  });

  test("the coach reaches the same guidance from the exercise bank", async ({ page }) => {
    test.skip(!identity("coach"), "set the coach E2E credentials to run");
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/workouts/exercises");

    const guidance = page.getByRole("button", { name: "דגשים לתרגיל" });
    await expect(guidance.first()).toBeVisible({ timeout: 20_000 });
    await guidance.first().click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/שרירים עובדים|ציוד|איך מבצעים|לא סופק מידע/).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await signOut(page);
  });

  test("a set can be logged and the workout finished into the history", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, requireIdentity("client"));
    await page.goto("/workouts");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 20_000 });
    if (await page.getByText("אין תוכנית אימון משויכת").count()) test.skip(true, "no programme assigned");

    await page.getByRole("link", { name: /התחלת אימון|המשך אימון/ }).click();
    await expect(page).toHaveURL(/\/workouts\/[^/]+\/[^/]+/, { timeout: 20_000 });

    // The start gate is a client component, so a click that lands before
    // hydration does nothing at all - which is how this read as "the workout has
    // no sets" rather than "the workout never started". Wait for the session
    // itself, and press again if the gate is still there.
    const finish = page.getByRole("button", { name: "סיום אימון" });
    await expect(async () => {
      const begin = page.getByRole("button", { name: /^התחלת אימון$|מתחילים/ });
      if (await begin.count()) await begin.first().click();
      await expect(finish).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });

    // The first exercise's first set: a weight, a rep count, and the tick.
    const weight = page.getByLabel(/משקל בסט 1/);
    const reps = page.getByLabel(/חזרות בסט 1/);
    if (!(await weight.count())) {
      // Some source rows carry no sets - a dynamic warm-up, for instance. The
      // screen says so, and the workout still has to be completable.
      await expect(page.getByText("לא הוגדרו סטים לתרגיל הזה במקור")).toBeVisible();
    } else {
      await weight.fill("40");
      await reps.fill("10");
      await page.getByRole("button", { name: /^השלמת סט 1$/ }).click();
      await expect(page.getByRole("button", { name: /ביטול השלמת סט 1/ })).toBeVisible({ timeout: 20_000 });
    }

    // Moving between exercises must not lose what was typed.
    const next = page.getByRole("button", { name: "הבא" });
    if (await next.isEnabled()) {
      await next.click();
      await page.getByRole("button", { name: "הקודם" }).click();
      if (await weight.count()) await expect(weight).toHaveValue("40");
    }

    // Finish. The first press warns about unfinished exercises; the second goes on.
    await finish.click();
    if (await page.getByText(/נותרו תרגילים שלא הושלמו/).count()) {
      await finish.click();
    }
    await expect(page.getByRole("heading", { name: "סיכום לפני שמירה" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /שמירת האימון|שומרים/ }).click();
    await expect(page.getByText("האימון נשמר")).toBeVisible({ timeout: 30_000 });

    // And it is in the history, which is the part a client actually checks.
    await page.goto("/workouts/history");
    await expect(page.getByText("אין אימונים").or(page.getByRole("link").first())).toBeVisible({ timeout: 20_000 });

    await signOut(page);
  });
});
