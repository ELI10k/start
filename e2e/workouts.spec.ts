import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

test.describe("workouts - client", () => {
  test.skip(!identity("client"), "set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page, requireIdentity("client"));
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("the workouts screen loads for a signed-in client", async ({ page }) => {
    await page.goto("/workouts");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("either an active program or an explicit empty state is shown", async ({ page }) => {
    await page.goto("/workouts");
    const main = page.locator("main");
    const text = await main.innerText();
    // Never a blank screen: the client sees a program or a sentence explaining why not.
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("workout history is reachable and scoped to this client", async ({ page }) => {
    await page.goto("/workouts/history");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("the progress view for workouts renders", async ({ page }) => {
    await page.goto("/workouts/progress");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });

  test("a client cannot open the coach workout builder", async ({ page }) => {
    await page.goto("/coach/workouts");
    await expect(page).toHaveURL(/\/unauthorized|\/login|\/$/);
  });
});

test.describe("workouts - coach", () => {
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

  test("the coach can open the workout programs list", async ({ page }) => {
    await page.goto("/coach/workouts");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("the coach can open the exercise bank", async ({ page }) => {
    await page.goto("/coach/workouts/exercises");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });

  test("the coach can open the new-program screen", async ({ page }) => {
    await page.goto("/coach/workouts/new");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });

  test("the coach client list renders", async ({ page }) => {
    await page.goto("/coach/clients");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    // The route has a loading boundary that renders its own <main role="status">
    // while the list resolves, so on a slow viewport two <main> elements exist
    // for a moment and a bare locator("main") is a strict-mode violation rather
    // than a failure of the screen. What this test is for is that the list
    // arrives, so it waits for the list's own heading.
    await expect(page.getByRole("heading", { name: "לקוחות" })).toBeVisible({ timeout: 30_000 });
  });

  test("the coach check-in review screen renders", async ({ page }) => {
    await page.goto("/coach/check-ins");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });

  test("the coach notifications screen renders", async ({ page }) => {
    await page.goto("/coach/notifications");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });
});
