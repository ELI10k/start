import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, openMealCards } from "./support/guards";

/**
 * The four flows the 2026-08-20 review changed, exercised against a real
 * database rather than asserted from source.
 *
 * The first one is the reason this file exists. `markThreadRead` reached
 * `revalidatePath` from inside a page render, which Next throws on - and its
 * trigger condition is "there is an unread message", so both message screens
 * worked only while there was nothing to read. Nothing short of loading the
 * screen with an unread message in it proves that is gone.
 */

test.describe("2026-08-20 review", () => {
  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  // ------------------------------------------------------------ the crash

  test("the coach can open a thread that has something unread in it", async ({ page }) => {
    test.skip(!identity("coach") || !identity("client"), "set both E2E credentials to run");

    // The client writes first, so the coach's side has an unread message when it
    // renders - which is the only state that used to crash.
    await signIn(page, requireIdentity("client"));
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "השיחה עם המאמן" })).toBeVisible();
    const body = `בדיקת ${Date.now()}`;
    await page.getByLabel("תוכן ההודעה").fill(body);
    await page.getByRole("button", { name: "שליחה" }).click();
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });

    // Now the coach opens it. Before the fix this render threw.
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach");
    // Same skeleton-then-content sequence as the client screens: counting before
    // the dashboard has rendered reads an empty page and skips a passing test.
    await expect(page.getByRole("heading", { name: /שלום/ })).toBeVisible({ timeout: 30_000 });
    const waiting = page.getByRole("link", { name: /חדשות/ }).first();
    test.skip(!(await waiting.count()), "the coach dashboard shows no waiting thread");
    await waiting.click();

    // The screen rendered at all - that is the assertion. The message being on it
    // is the second one.
    await expect(page.getByRole("heading", { name: "הודעות" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(body)).toBeVisible();
  });

  test("the client can open a thread that has something unread in it", async ({ page }) => {
    test.skip(!identity("coach") || !identity("client"), "set both E2E credentials to run");

    await signIn(page, requireIdentity("coach"));
    const client = requireIdentity("client");
    await page.goto("/coach/clients");
    await expect(page.getByRole("heading", { name: "לקוחות" })).toBeVisible({ timeout: 30_000 });
    const row = page.locator(".app-list a").first();
    test.skip(!(await row.count()), "this coach holds no clients");
    await row.click();
    await page.waitForURL(/\/coach\/clients\/[0-9a-f-]{36}/);
    const clientId = page.url().match(/clients\/([0-9a-f-]{36})/)?.[1];
    expect(clientId, "could not read the client id from the URL").toBeTruthy();

    await page.goto(`/coach/clients/${clientId}?tab=messages`);
    const body = `תשובה ${Date.now()}`;
    await page.getByLabel("תוכן ההודעה").fill(body);
    await page.getByRole("button", { name: "שליחה" }).click();
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });

    // The client's own screen, with the coach's message unread on it.
    await signIn(page, client);
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "השיחה עם המאמן" })).toBeVisible({ timeout: 20_000 });
  });

  // ------------------------------------------------------- "same as yesterday"

  test("repeating yesterday fills the gaps and keeps a manual choice", async ({ page }) => {
    test.skip(!identity("client"), "set the client E2E credentials to run");
    await signIn(page, requireIdentity("client"));
    await page.goto("/nutrition");
    // The screen opens on a loading skeleton and fills in a moment later, so
    // counting straight after goto() reads the skeleton and skips a passing test.
    await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });

    const repeat = page.getByRole("button", { name: /כמו אתמול/ });
    test.skip(!(await repeat.count()), "no menu, or every group is already chosen today");

    // The meals are collapsed rows and only the one due right now is open, so
    // the groups are hidden unless the clock happens to agree with the spec.
    await openMealCards(page);

    // Choose one alternative by hand first. That choice is the thing the copier
    // must not touch.
    const option = page.locator("fieldset button").first();
    test.skip(!(await option.count()), "the active menu has no groups to choose from");
    const chosen = (await option.textContent())?.trim() ?? "";
    await option.click();
    await expect(page.locator("fieldset button[aria-pressed='true']").first()).toBeVisible({ timeout: 20_000 });

    const before = await page.getByRole("button", { name: /כמו אתמול/ }).count();
    test.skip(!before, "every group was filled by the manual choice");
    await page.getByRole("button", { name: /כמו אתמול/ }).click();
    await page.waitForLoadState("networkidle");

    // The manual choice survives. Whether anything was copied depends on whether
    // this account has yesterday's selections, so that is not asserted - the
    // guarantee under test is that pressing it never destroys today's work.
    await expect(page.getByText(chosen).first()).toBeVisible();
  });

  // ------------------------------------------- the adherence figure, in meals

  test("the client file counts adherence in meals", async ({ page }) => {
    test.skip(!identity("coach"), "set the coach E2E credentials to run");
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/clients");
    await expect(page.getByRole("heading", { name: "לקוחות" })).toBeVisible({ timeout: 30_000 });
    const row = page.locator(".app-list a").first();
    test.skip(!(await row.count()), "this coach holds no clients");
    await row.click();
    await page.waitForURL(/\/coach\/clients\/[0-9a-f-]{36}/);
    const clientId = page.url().match(/clients\/([0-9a-f-]{36})/)?.[1];
    await page.goto(`/coach/clients/${clientId}?tab=nutrition`);
    await expect(page.getByRole("heading", { name: "תזונה" }).first()).toBeVisible({ timeout: 30_000 });

    const label = page.getByText("ארוחות שסומנו היום");
    test.skip(!(await label.count()), "this client has no active menu");
    await expect(label).toBeVisible();
    // Rows are not the unit any more: a group holds a primary and its
    // alternatives, and only one of them is ever eaten.
    await expect(page.getByText(/ארוחות נענו היום/)).toBeVisible();
    await expect(page.getByText(/פריטים סומנו היום/)).toHaveCount(0);
  });

  // ------------------------------------------------ clients with no menu

  test("the coach can list clients with no menu and land in the builder", async ({ page }) => {
    test.skip(!identity("coach"), "set the coach E2E credentials to run");
    await signIn(page, requireIdentity("coach"));
    await page.goto("/coach/menus?status=no-menu");
    await expect(page.getByRole("heading", { name: "תפריטים" })).toBeVisible({ timeout: 30_000 });

    const empty = page.getByText("לכל הלקוחות הפעילים יש תפריט");
    if (await empty.count()) {
      await expect(empty).toBeVisible();
      return;
    }
    const row = page.locator(".app-list a").first();
    await expect(row).toBeVisible();
    await row.click();

    // The link has to save the step it promises: the builder opens with the
    // client already selected.
    await page.waitForURL(/\/coach\/menus\/new\?clientId=/);
    const picker = page.getByLabel("לקוח");
    await expect(picker).not.toHaveValue("");
  });
});
