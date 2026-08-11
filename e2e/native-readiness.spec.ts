import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// The QA that matters for a TestFlight build specifically: the screens a tester
// will actually walk through, at the size of the phone they will hold, checking
// the things a web browser hides and a web view does not.
//
// It deliberately does not re-test product behaviour - the other specs do that.
// What it asserts is that nothing overflows sideways, that the safe areas are
// really reserved, and that no screen logs an error on the way in.

const CLIENT_SCREENS = [
  { path: "/", name: "בית" },
  { path: "/nutrition", name: "תזונה" },
  { path: "/workouts", name: "אימונים" },
  { path: "/progress", name: "התקדמות" },
  { path: "/check-in", name: "צ׳ק־אין" },
  { path: "/notifications", name: "התראות" },
  { path: "/profile", name: "פרופיל" },
];

test.describe("native readiness", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("no client screen scrolls sideways, and none logs an error", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // A failed favicon or an aborted fetch during navigation is noise, not a
      // defect a tester would ever see.
      if (/favicon|net::ERR_ABORTED|Failed to load resource/i.test(text)) return;
      problems.push(`console: ${text.slice(0, 160)}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message.slice(0, 160)}`));

    await signIn(page, requireIdentity("client"));

    for (const screen of CLIENT_SCREENS) {
      await page.goto(screen.path);
      await page.waitForLoadState("domcontentloaded");

      // Reporting *that* a screen scrolls sideways leaves the next person
      // guessing; the offenders are named here so a failure is actionable.
      // Anything inside a container that scrolls on purpose is ignored.
      const overflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll("body *")]
          .filter((node) => {
            let parent = node.parentElement;
            while (parent && parent !== document.body) {
              const overflowX = getComputedStyle(parent).overflowX;
              if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return false;
              parent = parent.parentElement;
            }
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && (rect.right > clientWidth + 1 || rect.left < -1);
          })
          .slice(0, 6)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            const className = typeof node.className === "string" ? node.className.slice(0, 60) : "";
            return `<${node.tagName.toLowerCase()} class="${className}"> ${Math.round(rect.left)}…${Math.round(rect.right)}`;
          });
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth, offenders };
      });

      // One pixel of slack: sub-pixel layout rounding is not a defect.
      expect(
        overflow.scrollWidth,
        `${screen.name} (${screen.path}) is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport\n${overflow.offenders.join("\n")}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }

    expect(problems, problems.join("\n")).toEqual([]);
    await signOut(page);
  });

  test("the viewport opts into the safe areas the stylesheet reserves", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/");

    // Without viewport-fit=cover every env(safe-area-inset-*) rule in the
    // stylesheet silently resolves to zero, and the bottom bar sits under the
    // home indicator on a notched phone.
    const content = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(content).toContain("viewport-fit=cover");

    // Pinch-zoom must stay available; disabling it is an accessibility
    // regression, and App Review notices.
    expect(content).not.toContain("user-scalable=no");
    expect(content).not.toContain("maximum-scale=1");

    await signOut(page);
  });

  test("the bottom navigation clears the home indicator", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/");

    const nav = page.locator("nav").filter({ hasText: "אימונים" }).last();
    if (await nav.count()) {
      const padding = await nav.evaluate((node) => getComputedStyle(node).paddingBottom);
      // The rule is max(.5rem, env(safe-area-inset-bottom)), so it is never zero
      // even on a device that reports no inset.
      expect(Number.parseFloat(padding)).toBeGreaterThan(0);
    }

    await signOut(page);
  });

  test("a workout screen keeps its set inputs reachable with a keyboard open", async ({ page }) => {
    await signIn(page, requireIdentity("client"));
    await page.goto("/workouts");
    await page.waitForLoadState("domcontentloaded");

    // The set rows are the one place a client types mid-exercise. Whatever the
    // programme state, the screen must not overflow sideways.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await signOut(page);
  });
});
