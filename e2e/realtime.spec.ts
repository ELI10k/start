import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

/**
 * The message arrives without being asked for.
 *
 * Everything else in this suite navigates and then looks. This one deliberately
 * does not: the client's thread is opened, left alone, and the coach writes into
 * it from a second browser. If the message appears on the first screen without
 * anything touching it, the subscription is attached, its access token reached
 * the socket, and row-level security let the row through - which is the whole
 * feature, and none of it can be proved from the source.
 */

test.describe("a conversation arrives by itself", () => {
  test.skip(!identity("coach") || !identity("client"), "set both E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("the coach's reply lands on the client's open thread", async ({ browser }) => {
    test.setTimeout(180_000);
    let coachContext: BrowserContext | undefined;
    const clientContext = await browser.newContext();
    try {
      const clientPage: Page = await clientContext.newPage();
      await signIn(clientPage, requireIdentity("client"));
      await clientPage.goto("/messages");
      await expect(clientPage.getByRole("heading", { name: "השיחה עם המאמן" })).toBeVisible({ timeout: 30_000 });

      // The client's screen is now left completely alone. Nothing below touches it.
      coachContext = await browser.newContext();
      const coachPage = await coachContext.newPage();
      await signIn(coachPage, requireIdentity("coach"));
      await coachPage.goto("/coach/clients");
      await expect(coachPage.getByRole("heading", { name: "לקוחות" })).toBeVisible({ timeout: 30_000 });
      const row = coachPage.locator(".app-list a").filter({ hasText: "START E2E Client" }).first();
      test.skip(!(await row.count()), "the coach has no E2E client to write to");
      await row.click();
      await coachPage.waitForURL(/\/coach\/clients\/[0-9a-f-]{36}/, { timeout: 30_000 });
      const clientId = coachPage.url().match(/clients\/([0-9a-f-]{36})/)?.[1] ?? "";
      await coachPage.goto(`/coach/clients/${clientId}?tab=messages`);
      await expect(coachPage.getByRole("heading", { name: "הודעות" })).toBeVisible({ timeout: 30_000 });

      const body = `בזמן אמת ${Date.now()}`;
      await coachPage.getByLabel("תוכן ההודעה").fill(body);
      await coachPage.getByRole("button", { name: "שליחה" }).click();
      await expect(coachPage.locator(".message-thread").getByText(body)).toBeVisible({ timeout: 30_000 });

      // No reload, no navigation, no click on the client's side.
      await expect(
        clientPage.locator(".message-thread").getByText(body),
        "the client's open thread must receive the message without being touched",
      ).toBeVisible({ timeout: 30_000 });
      console.log("הגיע לבד:", body);
    } finally {
      await clientContext.close();
      await coachContext?.close();
    }
  });
});
