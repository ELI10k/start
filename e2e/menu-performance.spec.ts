import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

// The coach menu editor was the slowest screen in the app and occasionally
// exceeded the database statement timeout, dropping the coach on an error page.
// This measures the server render itself - a document request, no hydration - so
// a regression shows up as a number rather than as a flaky click.

const BUDGET_MS = 2_000;
const SAMPLES = 3;

async function timeDocument(request: { get: (url: string) => Promise<{ status: () => number }> }, url: string) {
  const started = Date.now();
  const response = await request.get(url);
  const elapsed = Date.now() - started;
  return { elapsed, status: response.status() };
}

test.describe("coach menu editor performance", () => {
  test.skip(!identity("coach"), "set the coach E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("a saved menu renders within budget and never times out", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, requireIdentity("coach"));

    await page.goto("/coach/menus");
    const first = page.locator('a[href^="/coach/menus/"]').first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    const href = await first.getAttribute("href");
    expect(href, "no saved menu to measure").toBeTruthy();

    // Warm the route once so the measurement is steady state, not a cold compile.
    await timeDocument(page.request, href!);

    const timings: number[] = [];
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const { elapsed, status } = await timeDocument(page.request, href!);
      // A statement timeout surfaces as a 500 from the server component.
      expect(status, `menu route returned ${status}`).toBeLessThan(400);
      timings.push(elapsed);
    }

    const median = [...timings].sort((left, right) => left - right)[Math.floor(timings.length / 2)];
    console.log(`menu editor render: ${timings.map((value) => `${value}ms`).join(", ")} (median ${median}ms)`);
    expect(median, `median render ${median}ms exceeded the ${BUDGET_MS}ms budget`).toBeLessThan(BUDGET_MS);

    // And the render is a real editor, not the statement-timeout error boundary.
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: "עריכת תפריט" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText("statement timeout");
  });

  // The statement timeouts never appeared on an idle server - they appeared when
  // several requests hit the route at once, which is exactly what a coach does by
  // opening a menu, going back and opening another.
  test("the editor survives concurrent opens without a statement timeout", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, requireIdentity("coach"));

    await page.goto("/coach/menus");
    const first = page.locator('a[href^="/coach/menus/"]').first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    const href = await first.getAttribute("href");
    expect(href).toBeTruthy();

    await timeDocument(page.request, href!);

    const started = Date.now();
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => page.request.get(href!)),
    );
    const elapsed = Date.now() - started;

    const statuses = responses.map((response) => response.status());
    console.log(`6 concurrent menu opens in ${elapsed}ms, statuses ${statuses.join(",")}`);
    // A 57014 statement timeout surfaces as a 500 from the server component.
    expect(statuses.every((status) => status < 400), `statuses ${statuses.join(",")}`).toBe(true);
  });

  test("the new-menu route renders within budget", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, requireIdentity("coach"));

    await timeDocument(page.request, "/coach/menus/new");
    const timings: number[] = [];
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const { elapsed, status } = await timeDocument(page.request, "/coach/menus/new");
      expect(status).toBeLessThan(400);
      timings.push(elapsed);
    }
    const median = [...timings].sort((left, right) => left - right)[Math.floor(timings.length / 2)];
    console.log(`new menu render: ${timings.map((value) => `${value}ms`).join(", ")} (median ${median}ms)`);
    expect(median, `median render ${median}ms exceeded the ${BUDGET_MS}ms budget`).toBeLessThan(BUDGET_MS);
  });
});
