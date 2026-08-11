import { expect, test } from "@playwright/test";
import { assertNotProduction, identity, requireIdentity, signIn, signOut } from "./support/guards";

// A diagnostic, not a guard. The QA sweep reports *that* a screen scrolls
// sideways; this reports *what* is doing it, so a fix is aimed rather than
// guessed at. Kept because "the page is 484px wide on a 390px phone" is a
// recurring class of bug and this turns it into one command.
test.describe("overflow probe", () => {
  test.skip(!identity("client"), "set the client E2E credentials to run");

  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("names every element wider than the viewport", async ({ page }) => {
    await signIn(page, requireIdentity("client"));

    for (const route of ["/progress", "/", "/nutrition", "/workouts"]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const offenders = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const describe = (node: Element) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName.toLowerCase(),
            className: typeof node.className === "string" ? node.className.slice(0, 90) : "",
            right: Math.round(rect.right),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
          };
        };
        return [...document.querySelectorAll("body *")]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            // Ignore anything inside a container that scrolls on purpose.
            let parent = node.parentElement;
            while (parent && parent !== document.body) {
              const overflow = getComputedStyle(parent).overflowX;
              if (overflow === "auto" || overflow === "scroll" || overflow === "hidden") return false;
              parent = parent.parentElement;
            }
            return rect.width > 0 && (rect.right > width + 1 || rect.left < -1);
          })
          .map(describe);
      });

      console.log(`\n${route}: ${offenders.length} element(s) past the viewport`);
      for (const item of offenders.slice(0, 12)) {
        console.log(`  <${item.tag} class="${item.className}"> left=${item.left} right=${item.right} width=${item.width}`);
      }
    }

    await signOut(page);
    expect(true).toBe(true);
  });
});
