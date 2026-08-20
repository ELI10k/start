import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

/**
 * The numbers were being pushed off the edge of a phone.
 *
 * A quantity cut in half is worse than a name cut in half - a name is still
 * recognisable at half length and "20" is not, and the quantity is the part the
 * client is being asked to act on.
 */
test("mobile widths do not cut the numbers off", async ({ page }, testInfo) => {
  test.skip(!identity("client"), "set the client E2E credentials to run");
  assertNotProduction(testInfo.project.use.baseURL);
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page, requireIdentity("client"));
  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "הארוחות של היום" })).toBeVisible({ timeout: 30_000 });

  const card = page.locator("details.meal-card").first();
  if (!(await card.evaluate((n) => (n as HTMLDetailsElement).open))) await card.locator("summary").click();
  const option = card.locator("fieldset button").first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  console.log("שורה:", (await option.innerText()).replace(/\n+/g, " · "));

  // Nothing may sit outside the viewport, and no row may be wider than it.
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("fieldset button, details.meal-card")]
      .filter((el) => el.getBoundingClientRect().right > width + 1 || el.getBoundingClientRect().left < -1);
    return { pageScrolls: document.documentElement.scrollWidth > width + 1, wide: wide.length };
  });
  console.log("גלילה אופקית:", overflow.pageScrolls, "| אלמנטים חורגים:", overflow.wide);
  expect(overflow.pageScrolls, "the page must not scroll sideways on a phone").toBe(false);
  expect(overflow.wide, "no row may hang off the edge").toBe(0);
});
