import { expect, test, type Page } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

// The three meal states, end to end.
//
// These need 202608100001_meal_day_status.sql applied. Until it is, the RPC does
// not exist and the screen falls back to the two-state behaviour, so the specs
// detect that and skip rather than fail - a missing migration is an operator
// task, not a code regression.

async function skipUnlessMigrated(page: Page) {
  await page.goto("/nutrition");
  const skip = page.getByRole("button", { name: "לא נאכל" }).first();
  const marked = page.getByText("לא נאכל", { exact: true }).first();
  const present = (await skip.count()) > 0 || (await marked.count()) > 0;
  test.skip(!present, "meal_day_status migration not applied to this database");
}

test.describe("meal status", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("a meal can be marked not eaten in one tap and reversed", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await skipUnlessMigrated(page);

    const unmarked = page.locator("article").filter({ has: page.getByRole("button", { name: "לא נאכל" }) }).first();
    test.skip(!(await unmarked.count()), "no unmarked meal today");

    // Pin the meal by its own heading. Filtering by "has a לא נאכל button" stops
    // matching the moment the meal is marked, and the locator would silently
    // drift to whichever meal is still unmarked.
    const title = (await unmarked.getByRole("heading").first().textContent())?.trim() ?? "";
    expect(title, "could not read the meal title").not.toBe("");
    const meal = page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).first();

    // One tap, no dialog in between.
    await meal.getByRole("button", { name: "לא נאכל" }).click();
    await expect(meal.getByText("לא נאכל", { exact: true })).toBeVisible({ timeout: 20_000 });

    // Reversible.
    await meal.getByRole("button", { name: "ביטול הסימון" }).click();
    await expect(meal.getByRole("button", { name: "לא נאכל" })).toBeVisible({ timeout: 20_000 });
  });

  test("a skipped meal adds nothing to the day's calories", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await skipUnlessMigrated(page);

    const readCalories = async () => {
      const text = await page.getByText(/קלוריות/).first().textContent();
      return text ?? "";
    };

    await page.goto("/");
    const before = await readCalories();

    await page.goto("/nutrition");
    const meal = page.locator("article").filter({ has: page.getByRole("button", { name: "לא נאכל" }) }).first();
    test.skip(!(await meal.count()), "no unmarked meal today");
    await meal.getByRole("button", { name: "לא נאכל" }).click();
    await expect(meal.getByText("לא נאכל", { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.goto("/");
    expect(await readCalories(), "a skipped meal changed the day's intake").toBe(before);

    await page.goto("/nutrition");
    await page.locator("article").filter({ hasText: "לא נאכל" }).first()
      .getByRole("button", { name: "ביטול הסימון" }).click();
  });

  test("a free-calorie meal opens one direct food picker", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await skipUnlessMigrated(page);

    const meal = page.locator("article").filter({ hasText: "קלוריות חופשיות" }).first();
    test.skip(!(await meal.count()), "no free-calorie meal on the assigned menu");

    await expect(meal.getByRole("button", { name: "בחר מה אכלת" })).toHaveCount(1);
    await expect(meal.getByRole("button", { name: "סימון הארוחה כנאכלה" })).toHaveCount(0);
    await expect(meal.getByRole("button", { name: "אכלתי משהו אחר" })).toHaveCount(0);
    await expect(meal.getByRole("button", { name: "לא נאכל" })).toHaveCount(0);

    await meal.getByRole("button", { name: "בחר מה אכלת" }).click();
    await expect(page.getByRole("heading", { name: "מה אכלת במסגרת הזו?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "תיאור" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ברקוד" })).toBeVisible();
    await expect(page.getByRole("button", { name: "מהמאגר" })).toBeVisible();
    await expect(page.getByRole("button", { name: "מהארוחות שלי" })).toBeVisible();
    await expect(page.getByRole("button", { name: "צילום" })).toBeVisible();
  });
});
