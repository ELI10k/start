import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

/**
 * The day, read one meal at a time, and what was eaten instead of it.
 *
 * Six meals in a single scroll is a page nobody reads to the end - and the
 * controls for marking a meal live at the bottom of each one, so the thing the
 * client came to do was always the furthest thing away.
 */

test.describe("the client's day", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("meals open one at a time, and what was eaten instead is recorded", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("client"));
    await page.goto("/nutrition");
    await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });

    const cards = page.locator("details.meal-card");
    const total = await cards.count();
    const open = await page.locator("details.meal-card[open]").count();
    console.log(`ארוחות: ${total} · פתוחות בהתחלה: ${open}`);
    for (let i = 0; i < Math.min(total, 3); i += 1) {
      console.log(`  ${i + 1}. ${(await cards.nth(i).locator("summary").innerText()).replace(/\n+/g, " · ")}`);
    }
    expect(total, "each meal renders as its own row").toBeGreaterThan(0);
    expect(open, "only the meal due now opens by itself").toBeLessThanOrEqual(1);

    // Opening one is a tap, and the groups are inside.
    const last = cards.nth(total - 1);
    if (!(await last.evaluate((node) => (node as HTMLDetailsElement).open))) {
      await last.locator("summary").click();
    }
    await expect(last.locator("fieldset").first()).toBeVisible({ timeout: 10_000 });

    // The food log: describe something eaten instead, against a meal.
    const substitute = cards.nth(total - 1).getByRole("button", { name: /אכלתי משהו אחר/ });
    // Once a meal is answered the button is gone - the meal is not asking any
    // more - so an already-answered meal has nothing left for this to exercise.
    test.skip(!(await substitute.count()), "this meal has already been answered today");
    await substitute.click();
    await expect(page.getByRole("button", { name: /^ברקוד$/ })).toBeVisible({ timeout: 10_000 });
    const note = `בדיקה ${Date.now()}`;
    await page.getByLabel("תיאור קצר").fill(note);
    await page.getByRole("button", { name: "שמירה" }).click();
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 30_000 });
    console.log("נרשם ומוצג:", note);
  });
});
