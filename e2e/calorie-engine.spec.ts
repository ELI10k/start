import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The headline change, checked in the real builder rather than only in the pure
// functions: choosing a client produces a target, and the screen says where that
// target came from.
//
// The arithmetic itself is proved exactly in tests/nutrition-engine.test.ts.
// What these add is the wiring, and they adapt to the data they find: a client
// whose intake predates these columns exercises the "name what is missing" path,
// and a client with a complete intake exercises the goal offsets. Both are real
// outcomes, so neither is treated as a failure.
test.describe("calorie engine in the builder", () => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("choosing a client either computes a target or names what is missing", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await expect(page.getByLabel("שם התפריט")).toHaveCount(1);

    const clientSelect = page.locator('select[aria-label="לקוח"]');
    const options = await clientSelect.locator("option").all();
    if (options.length < 2) test.skip(true, "no clients to choose from");

    // The first real client, whichever it is.
    const value = await options[1].getAttribute("value");
    await clientSelect.selectOption(value ?? "");

    // Either the chain is shown, or the missing inputs are named. Silence, or a
    // blank calorie field with no explanation, is the thing being fixed.
    const readout = page.getByText(/BMR/);
    const missing = page.getByText(/חסר בכרטיס הלקוח|לא ניתן לחשב יעד קלורי/);
    await expect(readout.or(missing).first()).toBeVisible({ timeout: 20_000 });

    if (await readout.count()) {
      // The whole chain is on screen, so a coach can see how the number was
      // reached rather than being handed it.
      await expect(page.getByText("מקדם פעילות")).toBeVisible();
      await expect(page.getByText("הוצאה יומית")).toBeVisible();
      await expect(page.getByText("יעד לפי המטרה")).toBeVisible();

      // And the calorie field is filled from it.
      const calories = page.getByLabel(/יעד קלוריות/);
      await expect(calories).not.toHaveValue("");
    }

    await signOut(page);
  });

  test("changing the goal moves the calorie target", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await expect(page.getByLabel("שם התפריט")).toHaveCount(1);

    const clientSelect = page.locator('select[aria-label="לקוח"]');
    const options = await clientSelect.locator("option").all();
    if (options.length < 2) test.skip(true, "no clients to choose from");
    await clientSelect.selectOption((await options[1].getAttribute("value")) ?? "");

    if (!(await page.getByText(/BMR/).count())) {
      test.skip(true, "the test client is missing an input, which its own test covers");
    }

    const calories = page.getByLabel(/יעד קלוריות/);
    await page.getByLabel("מטרה").selectOption("maintain");
    const maintain = Number(await calories.inputValue());

    await page.getByLabel("מטרה").selectOption("fast_cut");
    await expect(async () => {
      expect(Number(await calories.inputValue())).toBe(maintain - 500);
    }).toPass({ timeout: 10_000 });

    await page.getByLabel("מטרה").selectOption("dirty_bulk");
    await expect(async () => {
      expect(Number(await calories.inputValue())).toBe(maintain + 400);
    }).toPass({ timeout: 10_000 });

    // Macros are recomputed with it, and are marked as automatic.
    await expect(page.getByText("מחושב אוטומטית").first()).toBeVisible();
    await signOut(page);
  });

  test("a macro the coach types is kept until they ask for a recalculation", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus/new");
    await expect(page.getByLabel("שם התפריט")).toHaveCount(1);

    const clientSelect = page.locator('select[aria-label="לקוח"]');
    const options = await clientSelect.locator("option").all();
    if (options.length < 2) test.skip(true, "no clients to choose from");
    await clientSelect.selectOption((await options[1].getAttribute("value")) ?? "");
    if (!(await page.getByText(/BMR/).count())) test.skip(true, "the test client is missing an input");

    const protein = page.getByLabel(/יעד חלבון/);
    const carbs = page.getByLabel(/יעד פחמימות/);
    const carbsBefore = Number(await carbs.inputValue());

    await protein.fill("240");
    // The carbohydrates absorb it - the calorie target is the decision.
    await expect(async () => {
      expect(Number(await carbs.inputValue())).toBeLessThan(carbsBefore);
    }).toPass({ timeout: 10_000 });
    await expect(page.getByText("הוזן ידנית").first()).toBeVisible();

    // And it survives until the coach asks for the automatic values back.
    await page.getByRole("button", { name: "חשב מחדש" }).click();
    await expect(async () => {
      expect(Number(await protein.inputValue())).not.toBe(240);
    }).toPass({ timeout: 10_000 });

    await signOut(page);
  });
});
