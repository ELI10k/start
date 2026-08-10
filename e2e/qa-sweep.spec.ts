import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { assertNotProduction, identity, requireIdentity, signIn } from "./support/guards";

// A sweep across every screen a real user can reach, looking for the things a
// per-feature spec never checks: a route that throws on load, a request that
// fails silently, a page that scrolls sideways on a phone, a control too small
// to hit with a thumb.
//
// It writes reports/qa/<project>.json so a failure can be read without
// re-running, and screenshots every screen at an iPhone 13 viewport.

const CLIENT_ROUTES = [
  "/", "/nutrition", "/workouts", "/workouts/history", "/workouts/progress",
  "/progress", "/check-in", "/check-in/history", "/content", "/notifications",
  "/profile", "/support",
] as const;

const COACH_ROUTES = [
  "/coach", "/coach/clients", "/coach/menus", "/coach/menus/new", "/coach/foods",
  "/coach/workouts",
  "/coach/workouts/exercises", "/coach/workouts/new", "/coach/check-ins",
  "/coach/content", "/coach/content/new", "/coach/notifications",
  "/coach/clients/new",
] as const;

// Next's dev overlay, HMR socket and font preloads are noise, not defects.
const IGNORED_MESSAGE = /favicon|Download the React DevTools|webpack-hmr|_next\/static\/chunks\/app-pages|Fast Refresh/i;
const IGNORED_REQUEST = /_next\/(webpack-hmr|static\/development)|favicon|\.map$/i;

type Finding = Readonly<{ route: string; kind: string; detail: string }>;

// A control smaller than this is hard to hit on a phone. Inline links inside a
// paragraph are excluded: they are text, not targets.
const MIN_TOUCH = 44;

async function smallTargets(page: Page) {
  return page.evaluate((min) => {
    const inline = (node: Element) => {
      const parent = node.parentElement;
      if (!parent) return false;
      return ["P", "SPAN", "LI", "TD", "LABEL", "SMALL", "LEGEND"].includes(parent.tagName)
        && getComputedStyle(node).display.startsWith("inline");
    };
    // A checkbox or radio inside a label is not the target - the label is, and
    // tapping anywhere on it toggles the control. Only flag it when the label
    // itself is too small to hit.
    const wrapped = (node: Element) => {
      const label = node.closest("label");
      if (!label || label === node) return false;
      const box = label.getBoundingClientRect();
      return box.height >= min && box.width >= min;
    };
    return [...document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], select, input:not([type="hidden"])')]
      .filter((node) => {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const box = node.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        if (inline(node) || wrapped(node)) return false;
        return box.height < min || box.width < min;
      })
      .slice(0, 12)
      .map((node) => {
        const box = node.getBoundingClientRect();
        const label = (node.getAttribute("aria-label") || node.textContent || node.getAttribute("name") || "").trim().slice(0, 40);
        return `${node.tagName.toLowerCase()} "${label}" ${Math.round(box.width)}x${Math.round(box.height)}`;
      });
  }, MIN_TOUCH);
}

async function sweep(page: Page, routes: readonly string[], label: string, findings: Finding[]) {
  for (const route of routes) {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    const onConsole = (message: { type: () => string; text: () => string }) => {
      if (message.type() === "error" && !IGNORED_MESSAGE.test(message.text())) consoleErrors.push(message.text());
    };
    const onPageError = (error: Error) => pageErrors.push(error.message);
    const onResponse = (response: { status: () => number; url: () => string }) => {
      if (response.status() >= 400 && !IGNORED_REQUEST.test(response.url())) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("response", onResponse);

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const landed = new URL(page.url()).pathname;
    const main = page.locator("main").first();
    if (await main.count()) await expect(main).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    if (overflow.scroll > overflow.client + 1) {
      findings.push({ route, kind: "horizontal-scroll", detail: `${overflow.scroll} > ${overflow.client}` });
    }

    for (const detail of consoleErrors) findings.push({ route, kind: "console-error", detail });
    for (const detail of pageErrors) findings.push({ route, kind: "page-error", detail });
    for (const detail of failedRequests) findings.push({ route, kind: "request-error", detail });
    for (const detail of await smallTargets(page)) findings.push({ route, kind: "touch-target", detail });
    if (landed !== route) findings.push({ route, kind: "redirect", detail: `landed on ${landed}` });

    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);

    await page.screenshot({ path: `reports/qa/${label}${route.replaceAll("/", "_") || "_home"}.png`, fullPage: true });
  }
}

async function report(name: string, findings: readonly Finding[]) {
  await mkdir("reports/qa", { recursive: true });
  await writeFile(`reports/qa/${name}.json`, JSON.stringify(findings, null, 2));
}

test.describe("QA sweep", () => {
  test.beforeAll(({}, testInfo) => {
    assertNotProduction(testInfo.project.use.baseURL);
  });

  test("every client screen loads clean", async ({ page }, testInfo) => {
    test.skip(!identity("client"), "set the client E2E credentials to run");
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("client"));
    const findings: Finding[] = [];
    await sweep(page, CLIENT_ROUTES, "client", findings);
    await report(`client-${testInfo.project.name}`, findings);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  test("every coach screen loads clean", async ({ page }, testInfo) => {
    test.skip(!identity("coach"), "set the coach E2E credentials to run");
    test.setTimeout(180_000);
    await signIn(page, requireIdentity("coach"));
    const findings: Finding[] = [];
    await sweep(page, COACH_ROUTES, "coach", findings);
    await report(`coach-${testInfo.project.name}`, findings);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
