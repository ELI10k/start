import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

test.describe("content library", () => {
  test.skip(!identity("coach") || !identity("client"), "set both identities to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("the coach content list renders", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/content");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main").first()).toBeVisible();
    await signOut(page);
  });

  test("the coach can open the new-content form", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/content/new");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await signOut(page);
  });

  test("the client content library renders", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/content");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main").first()).toBeVisible();
    await signOut(page);
  });

  test("a client cannot reach the coach content editor", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/coach/content/new");
    await expect(page).toHaveURL(/\/unauthorized|\/login|\/$/);
    await signOut(page);
  });

  test("a content category page renders for the client", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/content/category/general");
    await expect(page).not.toHaveURL(/\/login/);
    await signOut(page);
  });
});

test.describe("notifications", () => {
  test.skip(!identity("client"), "set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("the client notification centre renders", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/notifications");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await expect(page.locator("main").first()).toBeVisible();
    await signOut(page);
  });

  test("notification preferences are reachable", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/preferences");
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    await signOut(page);
  });

  test("every notification link points at a real in-app route", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/notifications");
    const hrefs = await page
      .locator("main a[href]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
    for (const href of hrefs) {
      // A reminder that links nowhere is worse than no reminder at all.
      expect(href, `notification link is not in-app: ${href}`).toMatch(/^\/(?!\/)/);
    }
    await signOut(page);
  });

  test("the scheduler endpoint stays closed without the shared secret", async ({ request }) => {
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
    expect(
      (await request.get("/api/cron/reminders", { headers: { authorization: "Bearer nope" } })).status(),
    ).toBe(401);
  });
});
