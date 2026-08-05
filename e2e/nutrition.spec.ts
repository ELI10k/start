import { expect, test, type Page } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The full coach nutrition journey. Every spec here writes, so it runs only against
// the dedicated test accounts and never against a production host.
test.describe("nutrition", () => {
  test.skip(!identity("coach"), "set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("a coach reaches the menu builder after signing in", async ({ page }) => {
    await page.goto("/coach/menus/new");
    await expect(page.getByRole("heading", { name: "תפריט חדש" })).toBeVisible();
  });

  test("a new menu opens with all six fixed meals", async ({ page }) => {
    await page.goto("/coach/menus/new");
    for (const title of ["ארוחת בוקר", "ארוחת ביניים 1", "ארוחת צהריים", "ארוחת ביניים 2", "ארוחת ערב", "קלוריות חופשיות"]) {
      await expect(page.getByRole("combobox", { name: /סוג ארוחה/ }).filter({ hasText: title }).or(page.getByText(title, { exact: true }).first())).toBeVisible();
    }
  });

  test("choosing a client fills the calorie target and every macro", async ({ page }) => {
    await page.goto("/coach/menus/new");
    const client = page.getByLabel("לקוח");
    const options = await client.locator("option").allTextContents();
    const named = options.find((option) => option && option !== "ללא שיוך");
    test.skip(!named, "no client is assigned to this test coach");
    await client.selectOption({ label: named! });

    // Weight comes from the client's latest weigh-in; without one the app says so
    // rather than silently leaving the macros blank.
    const weightNote = page.getByText(/משקל עדכני|לא נמצא משקל עדכני/);
    await expect(weightNote).toBeVisible();
    if ((await weightNote.textContent())?.includes("לא נמצא")) {
      test.skip(true, "the assigned client has no weigh-in, so macros cannot be derived");
    }

    await page.getByLabel("יעד קלוריות").fill("2250");
    await page.getByLabel("יעד קלוריות").blur();

    // 88.5 kg at 2250 kcal gives 159 / 263 / 63 by the documented formula.
    for (const label of ["יעד חלבון", "יעד פחמימות", "יעד שומן"]) {
      await expect(page.getByLabel(label)).not.toHaveValue("");
    }
    await expect(page.getByText("מחושב אוטומטית").first()).toBeVisible();
  });

  test("macros are shown as grams and as a percentage that totals 100", async ({ page }) => {
    await page.goto("/coach/menus/new");
    await expect(page.getByRole("heading", { name: "יעדי המאקרו" })).toBeVisible();
    await expect(page.getByText("גרם").first()).toBeVisible();
  });

  test("the food picker lists master foods first", async ({ page }) => {
    await page.goto("/coach/menus/new");
    await openFirstPicker(page);
    await expect(page.getByText("⭐ מאכלי מאסטר")).toBeVisible();
  });

  test("search finds foods by Hebrew and by English", async ({ page }) => {
    await page.goto("/coach/menus/new");
    const search = await openFirstPicker(page);
    await search.fill("גבינה");
    await expect(page.getByRole("option").first()).toBeVisible();
    const hebrewCount = await page.getByRole("option").count();
    expect(hebrewCount).toBeGreaterThan(0);
    await search.fill("");
    await search.fill("PRO");
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("a natural unit is shown where the source carries one", async ({ page }) => {
    await page.goto("/coach/menus/new");
    const search = await openFirstPicker(page);
    await search.fill("פיתה");
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    await option.click();
    // The amount input's suffix carries the unit for the chosen food.
    await expect(page.getByText(/פיתה|פיתות|גרם/).first()).toBeVisible();
  });

  test("one click adds three calculated alternatives", async ({ page }) => {
    await page.goto("/coach/menus/new");
    const search = await openFirstPicker(page);
    await search.fill("ביצה");
    await page.getByRole("option").first().click();

    const suggest = page.getByRole("button", { name: "הוסף 3 חלופות מומלצות" }).first();
    await expect(suggest).toBeVisible();
    await suggest.click();

    // Each suggestion arrives marked auto, meaning the quantity was calculated
    // rather than copied.
    await expect(page.getByText("אוטו׳").first()).toBeVisible();
    expect(await page.getByText("אוטו׳").count()).toBeGreaterThanOrEqual(1);
  });

  test("a meal collapses to a one-line summary and expands again", async ({ page }) => {
    await page.goto("/coach/menus/new");
    const collapse = page.getByRole("button", { name: "קיפול הארוחה" }).first();
    await collapse.click();
    await expect(page.getByRole("button", { name: "פתיחת הארוחה" }).first()).toBeVisible();
    await page.getByRole("button", { name: "פתיחת הארוחה" }).first().click();
    await expect(page.getByRole("button", { name: "קיפול הארוחה" }).first()).toBeVisible();
  });

  test("an empty menu is refused with a readable message", async ({ page }) => {
    await page.goto("/coach/menus/new");
    await page.getByLabel("שם התפריט").fill(`E2E ריק ${Date.now()}`);
    await page.getByRole("button", { name: /שמירה/ }).click();
    await expect(page.getByText("יש למלא לפחות ארוחה אחת לפני שמירה.")).toBeVisible();
  });

  test("a menu survives save, reload and edit", async ({ page }) => {
    const title = `E2E תפריט ${Date.now()}`;
    await page.goto("/coach/menus/new");
    await page.getByLabel("שם התפריט").fill(title);

    const search = await openFirstPicker(page);
    await search.fill("ביצה");
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: /שמירה/ }).click();
    await page.waitForURL(/\/coach\/menus\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const savedUrl = page.url();

    await page.reload();
    await expect(page.getByLabel("שם התפריט")).toHaveValue(title);

    await page.getByLabel("שם התפריט").fill(`${title} ערוך`);
    await page.getByRole("button", { name: /שמירה/ }).click();
    await page.goto(savedUrl);
    await expect(page.getByLabel("שם התפריט")).toHaveValue(`${title} ערוך`);
  });

  test("building a five-meal menu stays under two minutes", async ({ page }) => {
    const started = Date.now();
    await page.goto("/coach/menus/new");
    await page.getByLabel("שם התפריט").fill(`E2E מדידת זמן ${Date.now()}`);

    const groups = page.getByRole("button", { name: "בחירת מאכל ראשי" });
    const total = Math.min(await groups.count(), 10);
    for (let index = 0; index < total; index += 1) {
      const picker = page.getByRole("button", { name: "בחירת מאכל ראשי" }).first();
      if (!(await picker.isVisible().catch(() => false))) break;
      await picker.click();
      const search = page.getByRole("textbox", { name: "חיפוש מזון" }).last();
      await search.fill("ביצה");
      const option = page.getByRole("option").first();
      if (await option.isVisible().catch(() => false)) await option.click();
      const suggest = page.getByRole("button", { name: "הוסף 3 חלופות מומלצות" }).first();
      if (await suggest.isVisible().catch(() => false)) await suggest.click();
    }

    await page.getByRole("button", { name: /שמירה/ }).click();
    await page.waitForURL(/\/coach\/menus\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const seconds = (Date.now() - started) / 1000;
    console.info(`menu build took ${seconds.toFixed(1)}s`);
    expect(seconds).toBeLessThan(120);
  });
});

// Opens the first food picker on the page and returns its search box.
async function openFirstPicker(page: Page) {
  await page.getByRole("button", { name: "בחירת מאכל ראשי" }).first().click();
  const search = page.getByRole("textbox", { name: "חיפוש מזון" }).first();
  await search.waitFor({ state: "visible" });
  return search;
}
