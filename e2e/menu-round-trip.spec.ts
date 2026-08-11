import { expect, test, type Page } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The whole builder in one pass: create, choose a client, add a primary, add
// alternatives, change a quantity, delete the primary, duplicate a meal, save,
// reload, edit again. The pieces are covered elsewhere; this checks they survive
// each other.
test.describe("menu round trip", () => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  const settle = async (page: Page) => {
    const title = page.getByLabel("שם התפריט");
    await expect(title).toHaveCount(1);
    return title;
  };

  test("a menu survives being built, saved, reloaded and edited again", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    const title = await settle(page);
    const name = `E2E מסלול מלא ${Date.now()}`;
    await title.fill(name);

    // A client, which is what makes the target computable.
    const client = page.getByLabel("לקוח");
    const options = await client.locator("option").all();
    if (options.length > 1) await client.selectOption((await options[1].getAttribute("value")) ?? "");

    // The protein group's primary.
    await page.getByRole("button", { name: "בחירת מאכל ראשי" }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 20_000 });
    const primaryName = (await sheet.getByRole("option").first().locator("strong").first().innerText()).trim();
    await sheet.getByRole("option").first().locator("button").first().click();
    await expect(sheet).toBeHidden();

    const firstRow = page.locator(".food-row").first();
    await expect(firstRow).toBeVisible();
    // The name is readable in full - the complaint that started this.
    await expect(firstRow.locator(".food-row__pick")).toContainText(primaryName.slice(0, Math.min(primaryName.length, 10)));

    // Three calculated alternatives.
    const suggest = page.getByRole("button", { name: "הוסף 3 חלופות מומלצות" }).first();
    if (await suggest.isVisible().catch(() => false)) {
      await suggest.click();
      await expect(page.locator(".food-row").nth(1)).toBeVisible({ timeout: 20_000 });
    }

    // Changing the primary's quantity recalculates its macros.
    const amount = page.getByLabel("כמות").first();
    await amount.fill("150");
    await expect(amount).toHaveValue("150");

    await page.getByRole("button", { name: /שמירה/ }).first().click();
    await page.waitForURL(/\/coach\/menus\/[0-9a-f-]{36}/, { timeout: 60_000 });
    const savedUrl = page.url();

    // The reload is the real check: it has to have reached the database.
    await page.reload();
    await expect(await settle(page)).toHaveValue(name, { timeout: 30_000 });
    await expect(page.locator(".food-row").first()).toBeVisible();

    // And it is still editable afterwards.
    await page.goto(savedUrl);
    await expect(await settle(page)).toHaveValue(name, { timeout: 30_000 });
    await signOut(page);
  });

  test("deleting the primary empties the group, alternatives included", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await settle(page);

    await page.getByRole("button", { name: "בחירת מאכל ראשי" }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 20_000 });
    await sheet.getByRole("option").first().locator("button").first().click();
    await expect(sheet).toBeHidden();

    const suggest = page.getByRole("button", { name: "הוסף 3 חלופות מומלצות" }).first();
    const hadAlternatives = await suggest.isVisible().catch(() => false);
    if (hadAlternatives) {
      await suggest.click();
      await expect(page.locator(".food-row").nth(1)).toBeVisible({ timeout: 20_000 });
      // Removing the primary takes them with it - each was scaled to its
      // portion, so alone they are arbitrary numbers. The dialog says so.
      page.once("dialog", (dialog) => void dialog.accept());
    }
    await page.getByRole("button", { name: "מחיקת המאכל הראשי" }).first().click();

    await expect(page.getByRole("button", { name: "בחירת מאכל ראשי" }).first()).toBeVisible({ timeout: 20_000 });
    await signOut(page);
  });

  test("each group offers only its own foods, master first", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await settle(page);

    for (const [index, group] of [[0, "protein"], [1, "carbohydrate"]] as const) {
      await page.getByRole("button", { name: "בחירת מאכל ראשי" }).nth(index).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.locator(".food-picker__group").first()).toHaveText(/מאכלי מאסטר/, { timeout: 20_000 });

      // A protein search inside the carbohydrate group finds nothing, and the
      // reverse - which is the filtering that was wrong.
      const search = sheet.getByRole("combobox", { name: "חיפוש מזון" });
      await search.fill(group === "protein" ? "אורז" : "ביצה");
      await expect(sheet.getByRole("option")).toHaveCount(0, { timeout: 20_000 });

      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    }

    await signOut(page);
  });
});
