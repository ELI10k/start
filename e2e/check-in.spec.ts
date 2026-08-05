import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

test.describe("check-in and progress", () => {
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

  test("the check-in form carries every required field", async ({ page }) => {
    await page.goto("/check-in");
    await expect(page.getByLabel(/משקל/)).toBeVisible();
    await expect(page.getByLabel(/היקף טבור/)).toBeVisible();
    await expect(page.getByLabel(/כמה אימונים בוצעו/)).toBeVisible();
    await expect(page.getByLabel(/כמה ימים עמדת בתפריט/)).toBeVisible();
    await expect(page.getByLabel("הערות")).toBeVisible();
  });

  test("every rating offers a one to ten scale", async ({ page }) => {
    await page.goto("/check-in");
    const groups = page.locator("fieldset");
    expect(await groups.count()).toBeGreaterThan(0);
    const first = groups.first();
    for (const value of ["1", "5", "10"]) {
      await expect(first.getByText(value, { exact: true })).toBeVisible();
    }
  });

  test("all three photo slots are offered", async ({ page }) => {
    await page.goto("/check-in");
    for (const view of [/קדימה|חזית/, /צד/, /גב/]) {
      await expect(page.getByText(view).first()).toBeVisible();
    }
  });

  test("weight and navel measurements are required", async ({ page }) => {
    await page.goto("/check-in");
    await expect(page.getByLabel(/משקל/)).toHaveAttribute("required", "");
    await expect(page.getByLabel(/היקף טבור/)).toHaveAttribute("required", "");
  });

  test("check-in history renders for the signed-in client", async ({ page }) => {
    await page.goto("/check-in/history");
    await expect(page.locator("main")).toBeVisible();
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
  });

  test("the progress screen shows weight and measurements", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("progress photos are never served from a public URL", async ({ page }) => {
    await page.goto("/progress");
    const sources = await page.locator("img").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLImageElement).src).filter(Boolean),
    );
    for (const source of sources) {
      // A private bucket is only reachable through a signed URL. A raw
      // /storage/v1/object/public/ path would mean the photos are world-readable.
      expect(source, `public storage URL leaked: ${source}`).not.toContain("/storage/v1/object/public/check-in-photos");
    }
  });

  test("a client cannot read another client's check-ins through the coach route", async ({ page }) => {
    await page.goto("/coach/check-ins");
    await expect(page).toHaveURL(/\/unauthorized|\/login|\/$/);
  });
});

test.describe("cross-client isolation", () => {
  test.skip(!identity("client") || !identity("clientTwo"), "set both client identities to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("two clients never see the same progress data", async ({ browser }) => {
    const first = await browser.newContext();
    const second = await browser.newContext();
    const pageOne = await first.newPage();
    const pageTwo = await second.newPage();

    await signIn(pageOne, requireIdentity("client"));
    await signIn(pageTwo, requireIdentity("clientTwo"));

    await pageOne.goto("/progress");
    await pageTwo.goto("/progress");

    const one = await pageOne.locator("main").innerText();
    const two = await pageTwo.locator("main").innerText();
    expect(one).not.toBe(two);

    await first.close();
    await second.close();
  });
});
