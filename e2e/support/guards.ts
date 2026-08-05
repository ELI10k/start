import type { Page } from "@playwright/test";

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
export async function signIn(page: Page, who: TestIdentity): Promise<void> {
  await page.goto("/login");
  const toggle = page.getByRole("checkbox", { name: /כניסה לחשבון בדיקה/ });
  await toggle.waitFor({ state: "visible" });
  await toggle.check();
  await page.getByLabel("אימייל").fill(who.email);
  await page.getByLabel("סיסמת בדיקה").fill(who.password);
  await page.getByRole("button", { name: "כניסת בדיקה" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

export async function signOut(page: Page): Promise<void> {
  await page.request.post("/auth/logout");
  await page.context().clearCookies();
}
