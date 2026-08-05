import { expect, test } from "@playwright/test";
import { assertNotProduction, identity } from "./support/guards";

// These run without any credentials, so they are the part of the suite that can be
// executed anywhere. They cover the surfaces an unauthenticated visitor can reach.

test.beforeAll(({}, testInfo) => {
  assertNotProduction(testInfo.project.use.baseURL);
});

test("the login screen renders in Hebrew RTL", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "כניסה מאובטחת" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByLabel("אימייל")).toBeVisible();
});

// The test-account path needs E2E_TEST_LOGIN_ENABLED and E2E_TEST_EMAILS on the
// server. Skip rather than fail where the environment does not carry them.
test.describe("test-account login surface", () => {
  test.skip(!identity("coach"), "no E2E credentials configured for this environment");

test("the test-account path is offered outside production", async ({ page }) => {
  await page.goto("/login");
  // Local development and Preview carry the flag; production does not. The guard
  // above already refused to run here against a production host.
  await expect(page.getByRole("checkbox", { name: /כניסה לחשבון בדיקה/ })).toBeVisible();
});

test("ticking the test-account box reveals the password field and changes the action", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("סיסמת בדיקה")).toHaveCount(0);
  await page.getByRole("checkbox", { name: /כניסה לחשבון בדיקה/ }).check();
  await expect(page.getByLabel("סיסמת בדיקה")).toBeVisible();
  await expect(page.getByRole("button", { name: "כניסת בדיקה" })).toBeVisible();
});
});

for (const path of ["/", "/nutrition", "/workouts", "/progress", "/check-in", "/profile", "/notifications"]) {
  test(`an anonymous visitor is sent to login from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}

for (const path of ["/coach", "/coach/clients", "/coach/menus", "/coach/menus/new", "/coach/workouts", "/coach/check-ins"]) {
  test(`an anonymous visitor is sent to login from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}

test("the login redirect preserves where the visitor was heading", async ({ page }) => {
  await page.goto("/nutrition");
  await expect(page).toHaveURL(/\/login/);
  expect(page.url()).toContain("next=");
});

test("the reminder cron endpoint rejects an unauthenticated call", async ({ request }) => {
  const response = await request.get("/api/cron/reminders");
  expect(response.status()).toBe(401);
});

test("the reminder cron endpoint rejects a wrong token", async ({ request }) => {
  const response = await request.get("/api/cron/reminders", {
    headers: { authorization: "Bearer definitely-not-the-secret" },
  });
  expect(response.status()).toBe(401);
});

test("no page scrolls horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/login");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
