import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The layout complaints from the manual test, checked at the widths they were
// reported at. The food name being truncated is the one that matters: it is the
// only part of a row a coach cannot work out from the others.
test.describe("menu builder layout", () => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  const openFirstGroup = async (page: import("@playwright/test").Page) => {
    await page.goto("/coach/menus/new");
    const title = page.getByLabel("שם התפריט");
    await expect(title).toHaveCount(1);
    const pick = page.getByRole("button", { name: "בחירת מאכל ראשי" }).first();
    await pick.click();
    return page.getByRole("dialog");
  };

  test("a chosen food shows its whole name at every width, and never scrolls sideways", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    const sheet = await openFirstGroup(page);

    // Take the first master food, whatever it is called.
    const option = sheet.getByRole("option").first();
    await expect(option).toBeVisible({ timeout: 20_000 });
    const chosen = (await option.locator("strong").first().innerText()).trim();
    await option.locator("button").first().click();
    await expect(sheet).toBeHidden();

    const row = page.locator(".food-row").first();
    await expect(row).toBeVisible();

    for (const width of [1440, 834, 390]) {
      await page.setViewportSize({ width, height: 900 });

      // The name is rendered in full rather than clipped. Comparing the
      // element's scroll width with its client width is what catches an
      // ellipsis; comparing the text would not, since the DOM keeps it either way.
      const nameButton = row.locator(".food-row__pick").first();
      const clipped = await nameButton.evaluate((node) => node.scrollWidth > node.clientWidth + 1);
      expect(clipped, `the food name is truncated at ${width}px`).toBe(false);
      await expect(nameButton).toContainText(chosen.slice(0, Math.min(chosen.length, 12)));

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `the builder scrolls sideways at ${width}px`).toBeLessThanOrEqual(1);
    }

    // Right-to-left throughout, which is what makes the two-row layout read in
    // the right order.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await signOut(page);
  });

  test("the primary food can be removed, and the group returns to empty", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    const sheet = await openFirstGroup(page);
    await sheet.getByRole("option").first().locator("button").first().click();
    await expect(sheet).toBeHidden();

    await expect(page.locator(".food-row").first()).toBeVisible();

    // One row, one deletion - and the button is named for the food it removes,
    // not for its position. "מחיקת המאכל הראשי" has not existed since the group
    // stopped being emptied by removing its first row.
    await page.locator(".food-row").first().getByRole("button", { name: /^הסרת / }).click();

    // Back to the state the group started in.
    await expect(page.getByRole("button", { name: "בחירת מאכל ראשי" }).first()).toBeVisible({ timeout: 20_000 });
    await signOut(page);
  });

  test("favorite foods stay first, before and during a search", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    const sheet = await openFirstGroup(page);

    const headings = sheet.locator(".food-picker__group");
    await expect(headings.first()).toHaveText(/מאכלים מועדפים/, { timeout: 20_000 });

    // Typing narrows the list. It must not dissolve the sections - which is
    // exactly what it used to do, ranking purely by relevance.
    // By role: the listbox is labelled "תוצאות חיפוש מזון", so a label match
    // alone finds both it and the input.
    await sheet.getByRole("combobox", { name: "חיפוש מזון" }).fill("א");
    await expect(headings.first()).toHaveText(/מאכלים מועדפים/, { timeout: 20_000 });

    await signOut(page);
  });
});
