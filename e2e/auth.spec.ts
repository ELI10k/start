import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut, signOutThroughApp } from "./support/guards";

test.describe("auth and permissions", () => {
  test.skip(!identity("coach") || !identity("client"), "set the coach and client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("a coach lands on the coach dashboard", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    await expect(page).toHaveURL(/\/coach/);
    await signOut(page);
  });

  test("a client lands on the client home", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await expect(page).toHaveURL(/\/(?!coach)/);
    await expect(page.getByRole("navigation", { name: "ניווט ראשי ללקוח" })).toBeVisible();
    await signOut(page);
  });

  test("a client cannot reach any coach route", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    for (const path of ["/coach", "/coach/clients", "/coach/menus", "/coach/check-ins"]) {
      await page.goto(path);
      await expect(page, `client reached ${path}`).toHaveURL(/\/unauthorized|\/login|^(?!.*\/coach)/);
      expect(page.url()).not.toMatch(/\/coach\/(clients|menus|check-ins)$/);
    }
    await signOut(page);
  });

  test("a coach cannot reach client-only screens", async ({ page }) => {
    await signIn(page, requireIdentity("coach"));
    for (const path of ["/nutrition", "/check-in", "/progress"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/unauthorized|\/coach|\/login/);
    }
    await signOut(page);
  });

  test("a session survives a new browser context restore", async ({ page, context }) => {
    await signIn(page, requireIdentity("client"));
    const state = await context.storageState();
    expect(state.cookies.length).toBeGreaterThan(0);

    // A fresh page in the same context is the browser being reopened with its cookies.
    const reopened = await context.newPage();
    await reopened.goto("/");
    await expect(reopened).not.toHaveURL(/\/login/);
    await reopened.close();
    await signOut(page);
  });

  test("a reload keeps the client signed in", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/workouts");
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await signOut(page);
  });

  test("the auth cookies outlive the browser window", async ({ page, context, browser }) => {
    await signIn(page, requireIdentity("client"));
    const state = await context.storageState();
    const authCookies = state.cookies.filter((cookie) => cookie.name.startsWith("sb-"));
    expect(authCookies.length).toBeGreaterThan(0);
    // A session cookie has expires === -1 and would be gone the moment the
    // browser closes - which is exactly the "I have to ask for a magic link
    // every time" complaint. Each auth cookie must carry a real expiry.
    for (const cookie of authCookies) {
      expect(cookie.expires, `${cookie.name} is a session cookie`).toBeGreaterThan(Date.now() / 1000);
    }

    // A brand-new context is the browser having been quit and reopened.
    const reopened = await browser.newContext({ storageState: state });
    const restored = await reopened.newPage();
    await restored.goto("/");
    await expect(restored).not.toHaveURL(/\/login/);
    await reopened.close();
    await signOut(page);
  });

  test("a signed-in visitor is not asked for a magic link again", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    // Going back to the login screen with a valid session lands in the app
    // rather than showing the form.
    await page.goto("/login");
    await expect(page).not.toHaveURL(/\/login/);
    await signOut(page);
  });

  test("a coach session survives a reload and a second tab", async ({ page, context }) => {
    await signIn(page, requireIdentity("coach"));
    await page.reload();
    await expect(page).toHaveURL(/\/coach/);
    const second = await context.newPage();
    await second.goto("/coach/clients");
    await expect(second).not.toHaveURL(/\/login/);
    await second.close();
    await signOut(page);
  });

  test("logging out ends the session and protects the routes again", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await signOutThroughApp(page, requireIdentity("client"));
    await page.goto("/nutrition");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signing in again after logout works", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await signOutThroughApp(page, requireIdentity("client"));
    await signIn(page, requireIdentity("client"));
    await expect(page).not.toHaveURL(/\/login/);
    await signOut(page);
  });

  test("an expired session sends the visitor to login, not to unauthorized", async ({ page, context }) => {
    await signIn(page, requireIdentity("client"));
    await context.clearCookies();
    await page.goto("/nutrition");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("the magic-link form rejects a malformed address", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("אימייל").first();
    await email.fill("not-an-email");
    await page.getByRole("button", { name: "שליחת קישור התחברות" }).click();
    // The field is type="email" and required, so the browser refuses to submit at
    // all - no round trip, no server error. Assert that guard rather than an alert
    // the app is right never to render.
    const invalid = await email.evaluate((node) => !(node as HTMLInputElement).validity.valid);
    expect(invalid).toBe(true);
    await expect(page).toHaveURL(/\/login/);
  });
});
