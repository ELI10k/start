import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

/**
 * "I ate less than that."
 *
 * A plan prescribes a portion and a person eats what a person eats. Only the
 * totals prove this works, and only against a real database: the override is a
 * column on the selection and the scaling happens in the repository.
 */

test.describe("portion override", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("changing a portion moves the day's totals, and clears back to the plan", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("client"));
    await page.goto("/nutrition");
    await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });

    const reset = page.getByRole("button", { name: /חזרה למתוכנן/ });
    const totals = async () => (await page.locator("dl").first().innerText()).replace(/\n+/g, " | ");

    // Any override left behind by an earlier run goes first, or the control
    // opens already changed and there is no baseline to compare against.
    while (await reset.count()) {
      await reset.first().click();
      await expect(reset).toHaveCount(0, { timeout: 20_000 });
    }

    const option = page.locator("fieldset button[aria-pressed]").first();
    test.skip(!(await option.count()), "no active menu with groups today");
    await option.click();

    // The control is server-rendered and only exists once a choice has round
    // tripped, so its arrival is the proof that the totals below it are the
    // totals for this selection - aria-pressed flips optimistically and would
    // have the baseline read from the page before the choice landed.
    const adjust = page.getByRole("button", { name: /אכלתי כמות אחרת/ }).first();
    await expect(adjust).toBeVisible({ timeout: 30_000 });
    const planned = await totals();

    await adjust.click();
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "עדכון" }) }).first();
    const field = form.locator("input[name=quantity]");
    const amount = Number(await field.inputValue());
    // Three quarters of a portion. Deliberately not a multiple of a tenth: with
    // step="0.1" the browser refuses it as a step mismatch and refuses it
    // silently, so the form never submits and the number never saves.
    const eaten = Math.round(amount * 0.75 * 100) / 100;
    await field.fill(String(eaten));
    await form.getByRole("button", { name: "עדכון" }).click();

    // Poll the totals rather than a control. A button's presence flickers while
    // the page re-renders, and clicking one mid-render lands on an element that
    // is already detaching - which reads as success and does nothing.
    await expect
      .poll(totals, { timeout: 30_000, message: `${amount} → ${eaten} must move the day's totals` })
      .not.toBe(planned);

    await expect(reset).toHaveCount(1, { timeout: 20_000 });
    await reset.first().click();
    await expect
      .poll(totals, { timeout: 30_000, message: "clearing it must restore the planned totals" })
      .toBe(planned);
  });
});
