import { expect, test, type Page } from "@playwright/test";
import { identity, requireIdentity, signIn } from "./support/guards";

// The client home on iPhone-sized screens.
//
// Regular iPhones show the complete home without a document scroll or the
// native rubber-band. A short phone and enlarged text stay reachable rather
// than clipping content.

const SIZES = [
  { name: "375 × 812 (iPhone X/11 Pro/12 mini)", width: 375, height: 812 },
  { name: "390 × 844 (iPhone 12–15)", width: 390, height: 844 },
  { name: "375 × 667 (short: iPhone SE)", width: 375, height: 667 },
];

async function openHome(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await signIn(page, requireIdentity("client"));
  await expect(page.locator(".home-screen")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("שעות שינה", { exact: true })).toBeVisible();
  await expect(page.locator(".quick-action-card")).toHaveCount(4);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const rect = (element: Element | null) => element?.getBoundingClientRect();
    const home = document.querySelector<HTMLElement>(".home-screen")!;
    const header = rect(document.querySelector(".mobile-app-header"));
    const nav = rect(document.querySelector(".bottom-app-nav"));
    const children = [...home.children].filter((element) => getComputedStyle(element).display !== "none" && element.getBoundingClientRect().height > 0);
    const cards = [...document.querySelectorAll<HTMLElement>(".quick-action-card")].map((card) => card.getBoundingClientRect());
    const values = [...document.querySelectorAll<HTMLElement>(".dashboard-metrics--fit .metric-tile__value")];
    const tiles = [...document.querySelectorAll<HTMLElement>(".dashboard-metrics--fit .metric-tile")];
    const scroller = document.scrollingElement!;
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: Math.max(scroller.scrollWidth, document.body.scrollWidth),
      scrollHeight: scroller.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflowY,
      bodyPosition: getComputedStyle(document.body).position,
      headerBottom: header?.bottom ?? 0,
      firstTop: children[0]?.getBoundingClientRect().top ?? 0,
      lastBottom: Math.max(...children.map((element) => element.getBoundingClientRect().bottom)),
      navTop: nav?.top ?? window.innerHeight,
      actionHeights: cards.map((card) => Math.round(card.height)),
      actionWidths: cards.map((card) => Math.round(card.width)),
      metricWidths: tiles.map((tile) => Math.round(tile.getBoundingClientRect().width)),
      clippedValues: values.filter((value) => value.scrollWidth > value.clientWidth + 1 || value.getBoundingClientRect().right > value.closest(".metric-tile")!.getBoundingClientRect().right + 1 || value.getBoundingClientRect().left < value.closest(".metric-tile")!.getBoundingClientRect().left - 1).map((value) => value.textContent),
      ellipsised: values.filter((value) => getComputedStyle(value).textOverflow === "ellipsis").length,
      valueLines: values.map((value) => Math.round(value.getBoundingClientRect().height / parseFloat(getComputedStyle(value).lineHeight || "20"))),
      rowHeights: tiles.map((tile) => Math.round(tile.getBoundingClientRect().height)),
      fadedTiles: tiles.filter((tile) => Number(getComputedStyle(tile).opacity) < 1).length,
      disabledTiles: tiles.filter((tile) => (tile as HTMLButtonElement).disabled).length,
    };
  });
}

for (const size of SIZES) {
  test(`home at ${size.name}: no sideways scroll, nothing behind the tab bar`, async ({ page }) => {
    test.skip(!identity("client"), "set the client E2E credentials to run");
    test.setTimeout(120_000);
    await openHome(page, size.width, size.height);

    const top = await measure(page);
    expect(top.documentWidth, "no horizontal overflow").toBeLessThanOrEqual(top.viewportWidth);
    if (size.height >= 812) expect(top.scrollHeight, "the regular iPhone home does not scroll").toBeLessThanOrEqual(top.viewportHeight + 1);
    expect(top.bodyPosition, "body is not pinned").not.toBe("fixed");
    expect(top.bodyOverflow, size.height >= 760 ? "regular iPhone body is locked" : "short phone body can scroll").toBe(size.height >= 760 ? "hidden" : "auto");
    expect(top.firstTop - top.headerBottom, "no empty band under LIFE FIT").toBeLessThanOrEqual(24);
    expect(top.clippedValues, "every figure fits its tile").toEqual([]);
    expect(top.ellipsised, "no figure is ellipsised").toBe(0);
    expect(top.fadedTiles + top.disabledTiles, "health tiles are neither faded nor disabled").toBe(0);
    expect(Math.max(...top.metricWidths.slice(0, 3)) - Math.min(...top.metricWidths.slice(0, 3)), "the top three cards have equal widths").toBeLessThanOrEqual(2);
    expect(Math.abs(top.metricWidths[3] - top.metricWidths[4]), "steps and sleep have equal widths").toBeLessThanOrEqual(2);
    expect(top.metricWidths[3], "the two Health summaries are wider than a top metric").toBeGreaterThan(top.metricWidths[0]);
    // Same height across each metrics row; four quick actions alike, each a real target.
    expect(new Set(top.rowHeights.slice(0, 3)).size).toBe(1);
    expect(new Set(top.rowHeights.slice(3)).size).toBe(1);
    expect(new Set(top.actionHeights).size).toBe(1);
    expect(Math.min(...top.actionHeights)).toBeGreaterThanOrEqual(44);
    expect(Math.min(...top.actionWidths)).toBeGreaterThanOrEqual(44);
    expect(Math.min(...top.actionHeights), "quick actions retain the substantial 12 October size").toBeGreaterThanOrEqual(104);

    // Scroll to the end where scrolling is needed: the last card clears the bar.
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
    const bottom = await measure(page);
    expect(bottom.lastBottom, "last card fully above the tab bar").toBeLessThanOrEqual(bottom.navTop);
  });
}

test("home with enlarged text still scrolls to its last card and clips no figure", async ({ page }) => {
  test.skip(!identity("client"), "set the client E2E credentials to run");
  test.setTimeout(120_000);
  await openHome(page, 375, 667);
  // What Dynamic Type at its larger settings does to a WKWebView's rem.
  await page.addStyleTag({ content: "html { font-size: 135% !important; }" });
  const top = await measure(page);
  expect(top.documentWidth).toBeLessThanOrEqual(top.viewportWidth);
  expect(top.clippedValues).toEqual([]);
  expect(top.scrollHeight, "taller than the screen, and reachable").toBeGreaterThan(top.viewportHeight);
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
  const bottom = await measure(page);
  expect(bottom.lastBottom).toBeLessThanOrEqual(bottom.navTop);
});

test("every home destination still opens", async ({ page }) => {
  test.skip(!identity("client"), "set the client E2E credentials to run");
  test.setTimeout(180_000);
  await openHome(page, 390, 844);
  for (const [name, path] of [["התפריט שלי", /\/nutrition/], ["צ׳ק אין", /\/check-in/], ["מדדי התקדמות", /\/progress/], ["תוכנית אימון", /\/workouts/]] as const) {
    await page.locator(".quick-action-card", { hasText: name }).click();
    await expect(page).toHaveURL(path, { timeout: 30_000 });
    await page.goto("/");
    await expect(page.locator(".home-screen")).toBeVisible({ timeout: 30_000 });
  }
  // In a browser the health cards cannot sync; a tap opens their detail.
  await page.locator('.metric-tile--health[data-metric="steps"]').click();
  await expect(page).toHaveURL(/\/progress\?metric=steps/, { timeout: 30_000 });
  await expect(page.getByRole("tab", { name: /צעדים/ })).toHaveAttribute("aria-selected", "true");
});
