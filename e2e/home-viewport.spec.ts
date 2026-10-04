import { expect, test } from "@playwright/test";
import { identity, requireIdentity, signIn } from "./support/guards";

test("the client home fits inside a short phone viewport", async ({ page }) => {
  test.skip(!identity("client"), "set the client E2E credentials to run");
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 375, height: 667 });
  await signIn(page, requireIdentity("client"));
  await expect(page.locator(".home-screen")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".quick-action-card")).toHaveCount(4);

  const layout = await page.evaluate(() => {
    const home = document.querySelector<HTMLElement>(".home-screen");
    const cards = [...document.querySelectorAll<HTMLElement>(".quick-action-card")];
    const visibleChildren = [...(home?.children ?? [])].filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && element.getBoundingClientRect().height > 0;
    });
    const bottom = Math.max(...visibleChildren.map((element) => element.getBoundingClientRect().bottom));

    return {
      bottom,
      viewport: window.innerHeight,
      tallestAction: Math.max(...cards.map((card) => card.getBoundingClientRect().height)),
    };
  });

  expect(layout.bottom, "all visible home sections should end above the viewport edge").toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.tallestAction, "the four primary cards should stay compact on a short phone").toBeLessThanOrEqual(80);
});
