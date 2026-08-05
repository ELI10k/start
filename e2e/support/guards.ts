import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activateDevice, applySession, cachedPasswordGrant } from "./session";

// Hostnames that serve real clients. A spec that writes must never point here.
const PRODUCTION_HOSTS = ["start.elicohenfitness.co.il", "start-snowy-eight.vercel.app"];

export function assertNotProduction(baseURL: string | undefined): void {
  if (!baseURL) throw new Error("E2E baseURL is not configured.");
  const host = new URL(baseURL).hostname;
  if (PRODUCTION_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to run E2E against production (${host}). ` +
        "Run against the local dev server or set E2E_BASE_URL to a Preview deployment.",
    );
  }
}

export type TestIdentity = Readonly<{ email: string; password: string; role: "coach" | "client" }>;

// Credentials come from the environment and are never read, logged or committed here.
// Set them in an ignored local file before running the authenticated specs:
//   E2E_COACH_EMAIL, E2E_COACH_PASSWORD, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD
// A second client is optional and only needed by the isolation specs:
//   E2E_CLIENT_TWO_EMAIL, E2E_CLIENT_TWO_PASSWORD
export function identity(role: "coach" | "client" | "clientTwo"): TestIdentity | null {
  const prefix = role === "coach" ? "E2E_COACH" : role === "client" ? "E2E_CLIENT" : "E2E_CLIENT_TWO";
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password, role: role === "coach" ? "coach" : "client" };
}

export function requireIdentity(role: "coach" | "client" | "clientTwo"): TestIdentity {
  const found = identity(role);
  if (!found) {
    throw new Error(
      `Missing E2E credentials for "${role}". See e2e/README.md for the variables to set.`,
    );
  }
  return found;
}

// The app's test-account path: tick "כניסה לחשבון בדיקה", then email plus password.
// It only exists where E2E_TEST_LOGIN_ENABLED and E2E_TEST_EMAILS are both set, which
// is Preview and local development - never Production.
// Preferred path: exchange the credential for a session in Node and inject the cookie.
// The password never enters the browser, so it can never reach a trace or a snapshot.
export async function signIn(page: Page, who: TestIdentity): Promise<void> {
  const baseURL = (page.context() as unknown as { _options?: { baseURL?: string } })._options?.baseURL
    ?? process.env.E2E_BASE_URL
    ?? "http://127.0.0.1:3100";
  const session = await cachedPasswordGrant(who.email, who.password);
  const deviceId = await applySession(page.context(), baseURL, session);
  if (who.role === "client") await activateDevice(session, deviceId);
  await page.goto(who.role === "coach" ? "/coach" : "/");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

// Kept for the spec that exercises the login form itself. Everything else uses signIn.
export async function signInThroughForm(page: Page, who: TestIdentity): Promise<void> {
  await page.goto("/login");
  const toggle = page.getByRole("checkbox", { name: /כניסה לחשבון בדיקה/ });
  await toggle.waitFor({ state: "visible" });

  // The checkbox is server-rendered but only becomes functional once the client
  // component hydrates, which the dev server can take a moment to do. A click that
  // lands first is swallowed silently, so retry until the password field appears.
  await expect(async () => {
    if (!(await toggle.isChecked())) await toggle.check();
    await expect(page.getByLabel("סיסמת בדיקה")).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000, intervals: [250, 500, 1_000] });

  const passwordField = page.getByLabel("סיסמת בדיקה");
  await page.getByLabel("אימייל").fill(who.email);
  await passwordField.fill(who.password);
  await page.getByRole("button", { name: "כניסת בדיקה" }).click();

  // Playwright's failure snapshots record input values verbatim, so a failed run
  // would otherwise write the password into reports/e2e in clear text. The form has
  // already captured it by now; blank the field so nothing captured later holds it.
  await passwordField.fill("").catch(() => {});

  // Scope the error lookup to the form. Next's dev tools mount their own always-present
  // alert region, and matching that made every sign-in look instantly rejected.
  const formError = page.locator("main").getByRole("alert");
  const landed = page
    .waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
    .then(() => "ok" as const);
  const rejected = formError
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => "error" as const);
  const outcome = await Promise.race([landed, rejected]).catch(() => "ok" as const);
  if (outcome === "error") {
    throw new Error(`Test-account sign-in was rejected: ${await formError.innerText()}`);
  }
}

export async function signOut(page: Page): Promise<void> {
  await page.request.post("/auth/logout");
  await page.context().clearCookies();
}
