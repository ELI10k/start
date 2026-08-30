import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

/**
 * "I ate less than that", and "I ate none of it".
 *
 * A plan prescribes a portion and a person eats what a person eats. Only a real
 * database proves this: the override is a column on the selection and the
 * scaling happens in the repository.
 *
 * Both cases assert on the chosen row rather than on the day's totals. A meal
 * already answered - eaten, skipped, or eaten-as-something-else - contributes to
 * neither half of the summary, so on a day like that the totals cannot move no
 * matter what the override says, and an assertion on them would be measuring the
 * fixture instead of the feature. The row is the thing the override acts on.
 */

test.describe.configure({ mode: "serial" });

test.describe("portion override", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  /** Opens today's first meal, chooses something, and opens the amount control. */
  async function openControl(page: import("@playwright/test").Page) {
    await page.goto("/nutrition");
    await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });

    const card = page.locator("details.meal-card").first();
    if (!(await card.count())) return null;
    if (!(await card.evaluate((node) => (node as HTMLDetailsElement).open))) await card.locator("summary").click();

    // Any override left behind by an earlier run has to go before a baseline is
    // read, or the "prescribed" portion is itself an override and clearing back
    // to the plan looks like a failure.
    const clear = card.getByRole("button", { name: /חזרה למתוכנן/ });
    while (await clear.count()) {
      await clear.first().click();
      await expect(clear).toHaveCount(0, { timeout: 20_000 });
    }

    const option = card.locator("fieldset button[aria-pressed]").first();
    if (!(await option.count())) return null;
    // Only where it is not already chosen. The option row is a toggle - a second
    // tap clears the choice - and the case above this one leaves its option
    // selected, so clicking unconditionally turned the selection OFF before the
    // amount was ever typed. The group then had nothing to hang an amount on,
    // the update was refused, and the row read as prescribed: a green test that
    // had been silently reporting the wrong thing about a working feature.
    if ((await option.getAttribute("aria-pressed")) !== "true") await option.click();

    // The control is collapsed until it has been used and stays open afterwards,
    // so the earlier case in this file can leave it in either state. Its
    // quantity field appearing is the proof that the choice round tripped -
    // aria-pressed flips optimistically, before the server has answered.
    const collapsed = card.getByRole("button", { name: /אכלתי כמות אחרת/ });
    await expect(async () => {
      if (await collapsed.count()) await collapsed.first().click();
      await expect(card.locator("input[name=quantity]").first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 40_000 });

    return {
      card,
      form: card.locator("form").filter({ has: page.getByRole("button", { name: "עדכון" }) }).first(),
      row: async () =>
        (await card.locator("fieldset button[aria-pressed='true']").first().innerText()).replace(/\n+/g, " | "),
    };
  }

  test("a smaller portion is recorded, and clears back to the plan", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("client"));
    const control = await openControl(page);
    test.skip(!control, "no active menu with groups today");
    const { card, form, row } = control!;

    const prescribed = await row();
    const amount = Number(await form.locator("input[name=quantity]").inputValue());
    // Three quarters of a portion. Deliberately not a multiple of a tenth: with
    // step="0.1" the browser refuses it as a step mismatch and refuses it
    // silently, so the form never submits and the number never saves.
    const eaten = Math.round(amount * 0.75 * 100) / 100;
    console.log(`מתוכנן: ${prescribed} → מדווח ${eaten}`);

    await form.locator("input[name=quantity]").fill(String(eaten));
    await form.getByRole("button", { name: "עדכון" }).click();
    await expect
      .poll(row, { timeout: 30_000, message: `${amount} → ${eaten} must change the row` })
      .not.toBe(prescribed);
    console.log("אחרי עדכון:", await row());

    await card.getByRole("button", { name: /חזרה למתוכנן/ }).first().click();
    await expect
      .poll(row, { timeout: 30_000, message: "clearing must restore the prescribed portion" })
      .toBe(prescribed);
  });

  /**
   * The one honest answer for a portion that was served and left. Marking the
   * whole meal "לא נאכל" is a different claim: it says the meal did not happen,
   * when what happened is that one group of it did not.
   */
  test("eating none of a portion is accepted and costs that portion nothing", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("client"));
    const control = await openControl(page);
    test.skip(!control, "no active menu with groups today");
    const { card, form, row } = control!;

    const prescribed = await row();
    await form.locator("input[name=quantity]").fill("0");
    await form.getByRole("button", { name: "עדכון" }).click();
    await expect
      .poll(row, { timeout: 30_000, message: "zero must be accepted, not refused" })
      .not.toBe(prescribed);

    const zeroed = await row();
    console.log(`${prescribed}  →  ${zeroed}`);
    expect(zeroed, "the row has to read nothing at all").toContain("0 קל׳");

    await card.getByRole("button", { name: /חזרה למתוכנן/ }).first().click();
    await expect
      .poll(row, { timeout: 30_000, message: "clearing must restore the prescribed portion" })
      .toBe(prescribed);
  });
});
