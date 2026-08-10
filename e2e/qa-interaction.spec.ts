import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

// The parts of a screen a screenshot cannot show: whether the keyboard can reach
// and see a control, whether the back button returns where it should, and
// whether a sheet gives focus back when it closes.

test.describe("keyboard, focus and navigation", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("tabbing through the home screen always shows where focus is", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/");

    const invisible: string[] = [];
    for (let step = 0; step < 14; step += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const node = document.activeElement as HTMLElement | null;
        // Next's dev overlay injects its own focusable host element.
        if (!node || node === document.body || node.tagName.toLowerCase() === "nextjs-portal") return null;
        const style = getComputedStyle(node);
        const ring =
          (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== "none";
        const label = (node.getAttribute("aria-label") || node.textContent || "").trim().slice(0, 40);
        return { ring, label, tag: node.tagName.toLowerCase() };
      });
      if (focused && !focused.ring) invisible.push(`${focused.tag} "${focused.label}"`);
    }

    expect(invisible, `focused with no visible ring: ${invisible.join(", ")}`).toEqual([]);
  });

  test("the back button returns to the previous screen", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/");
    await page.getByRole("navigation", { name: "ניווט ראשי ללקוח" }).getByRole("link", { name: "אימונים" }).click();
    await page.waitForURL(/\/workouts$/);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: "מה חשוב לך היום" })).toBeVisible();

    await page.goForward();
    await page.waitForURL(/\/workouts$/);
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("a bottom sheet closes on Escape and hands focus back", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/progress");

    const opener = page.getByRole("button", { name: "הוספת מדידה" });
    await opener.click();

    const sheet = page.getByRole("dialog", { name: "הוספת מדידה" });
    await expect(sheet).toBeVisible();
    // The page behind a sheet must not scroll, or a phone scrolls the wrong layer.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
    await expect(opener).toBeFocused();
  });

  test("a sheet closes on a backdrop tap too", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/progress");

    await page.getByRole("button", { name: "הוספת מדידה" }).click();
    const sheet = page.getByRole("dialog", { name: "הוספת מדידה" });
    await expect(sheet).toBeVisible();

    await page.locator(".sheet-backdrop").click({ position: { x: 10, y: 10 } });
    await expect(sheet).toBeHidden();
  });

  test("screens settle without shifting under the reader", async ({ page }) => {
    await signIn(page, requireIdentity("client"));

    const shifts: string[] = [];
    for (const route of ["/", "/nutrition", "/workouts", "/progress", "/content", "/profile"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(1_200);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      // 0.1 is the Web Vitals threshold for "good". A skeleton that matches the
      // real layout is what keeps this near zero.
      if (cls > 0.1) shifts.push(`${route}: ${cls.toFixed(3)}`);
    }

    expect(shifts, `layout shifted after load: ${shifts.join(", ")}`).toEqual([]);
  });

  test("every client screen keeps its content clear of the bottom bar", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    const bar = page.locator(".bottom-app-nav");

    for (const route of ["/", "/workouts", "/progress", "/content", "/notifications", "/profile"]) {
      await page.goto(route);
      if (!(await bar.isVisible())) continue;

      // Scroll to the end and check the last thing on the page is still readable
      // rather than sitting under the fixed bar.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      // Measure the last rendered child, not the padded container: the padding is
      // precisely what is supposed to keep the content above the bar.
      const clearance = await page.evaluate(() => {
        const nav = document.querySelector(".bottom-app-nav");
        const content = document.querySelector(".client-app-content");
        if (!nav || !content) return 1;
        const last = [...content.children]
          .map((child) => child.getBoundingClientRect())
          .filter((box) => box.height > 0)
          .at(-1);
        if (!last) return 1;
        return nav.getBoundingClientRect().top - last.bottom;
      });
      expect(clearance, `content runs under the bottom bar on ${route}`).toBeGreaterThanOrEqual(0);
    }
  });
});
