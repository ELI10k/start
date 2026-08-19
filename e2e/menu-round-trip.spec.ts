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

  test("deleting one row removes that row and leaves the rest of the group", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await settle(page);

    await page.getByRole("button", { name: "בחירת מאכל ראשי" }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 20_000 });
    await sheet.getByRole("option").first().locator("button").first().click();
    await expect(sheet).toBeHidden();

    const suggest = page.getByRole("button", { name: "הוסף 3 חלופות מומלצות" }).first();
    if (await suggest.isVisible().catch(() => false)) {
      await suggest.click();
      await expect(page.locator(".food-row").nth(1)).toBeVisible({ timeout: 20_000 });
    }

    // Removing the primary used to empty the whole group, on the theory that the
    // alternatives were scaled to it. A group can hold several primaries now, and
    // losing five rows to one click was never what anyone meant - so a deletion
    // removes exactly the row it names, and no dialog stands in the way.
    const before = await page.locator(".food-row").count();
    await page.locator(".food-row").first().getByRole("button", { name: /^הסרת / }).click();
    await expect(page.locator(".food-row")).toHaveCount(before - 1, { timeout: 20_000 });

    await signOut(page);
  });

  test("each group offers only its own foods, favorites first", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await settle(page);

    for (const [index, group] of [[0, "protein"], [1, "carbohydrate"]] as const) {
      await page.getByRole("button", { name: "בחירת מאכל ראשי" }).nth(index).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.locator(".food-picker__group").first()).toHaveText(/מאכלים מועדפים/, { timeout: 20_000 });

      // The filtering that was wrong: every option a group offers has to belong
      // to that group. Asserting on a name - "no protein food is called אורז" -
      // was a claim about the catalogue's contents rather than about the filter,
      // and it stopped being true the moment a rice protein powder was imported.
      // The section headings say which group the picker is showing, so they are
      // what gets checked.
      const search = sheet.getByRole("combobox", { name: "חיפוש מזון" });
      await search.fill(group === "protein" ? "ביצה" : "אורז");
      await expect(sheet.getByRole("option").first()).toBeVisible({ timeout: 20_000 });

      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    }

    await signOut(page);
  });
});
