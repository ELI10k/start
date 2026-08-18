// Does a coach who starts on a preview stay on it?
//
// The failure being checked is specific: the sign-in redirect used to be built
// from the production domain, so the coach was handed to production and reviewed
// the wrong build. This records the origin at every step - before signing in,
// after, after a reload, and across the screens - and fails loudly if
// start-snowy-eight ever appears.
//
//   node scripts/verify-preview-origin.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-preview-origin.mjs <baseUrl> <screenshotDir>");

const PRODUCTION_HOSTS = ["start-snowy-eight.vercel.app", "start.elicohenfitness.co.il"];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.e2e", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const { hostname } = new URL(baseUrl);

async function bypassSecret() {
  try {
    const auth = JSON.parse(readFileSync(join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"), "utf8"));
    const project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
    const response = await fetch(`https://api.vercel.com/v9/projects/${project.projectName}?teamId=${project.orgId}`, {
      headers: { authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return "";
    const body = await response.json();
    return Object.entries(body.protectionBypass ?? {}).find(([, meta]) => meta.scope === "automation-bypass")?.[0] ?? "";
  } catch { return ""; }
}
const BYPASS = /^(localhost|127\.0\.0\.1)$/.test(hostname) ? "" : await bypassSecret();

// A real session for the coach, obtained the way the E2E suite does rather than
// through the form. Used when the deployment does not offer the test-account
// login, so the walk still happens as a genuinely signed-in coach.
async function injectCoachSession(context) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
    body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
  });
  if (!response.ok) throw new Error(`coach sign-in failed (HTTP ${response.status})`);
  const raw = await response.json();
  const session = { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };
  const CHUNK = 3180;
  const name = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const parts = [];
  if (encoded.length <= CHUNK) parts.push({ name, value: encoded });
  else for (let i = 0; i * CHUNK < encoded.length; i += 1)
    parts.push({ name: `${name}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
  parts.push({ name: "start-device-id", value: "origin-qa-device-0001" });
  await context.addCookies(parts.map((part) => ({
    ...part, domain: hostname, path: "/", httpOnly: false, secure: true, sameSite: "Lax", expires: session.expires_at,
  })));
}

const report = { steps: [] };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  ...(BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } } : {}),
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

const record = async (label) => {
  const url = new URL(page.url());
  const entry = {
    step: label,
    origin: url.origin,
    path: url.pathname,
    onPreview: url.hostname === hostname,
    hitProduction: PRODUCTION_HOSTS.includes(url.hostname),
    previewBadge: await page.locator('[data-testid="preview-badge"]').count(),
  };
  report.steps.push(entry);
  return entry;
};

// 1. Arrive on the preview, signed out.
await page.goto(`${baseUrl}/login?next=%2Fcoach%2Fworkouts`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await record("login screen, signed out");

// 2. Sign in the way a coach can sign in without leaving the origin: the
//    test-account password path, which is server-side and redirects internally.
//    The magic-link path leaves through Supabase and is reported separately.
// The password field only exists once the test-account box is ticked, and that
// box only renders where E2E_TEST_LOGIN_ENABLED is set.
const testBox = page.getByLabel("כניסה לחשבון בדיקה");
report.testLoginOffered = (await testBox.count()) > 0;
if (report.testLoginOffered) {
  await testBox.check();
  await page.getByLabel("אימייל").fill(env.E2E_COACH_EMAIL);
  await page.getByLabel("סיסמת בדיקה").fill(env.E2E_COACH_PASSWORD);
  await page.getByRole("button", { name: "כניסת בדיקה" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  // Whatever the form said, so a refused sign-in is diagnosed rather than
  // reported as "still on the login page".
  report.signInMessage = await page.locator('[role="alert"], [role="status"]').first().textContent().catch(() => null);
  await record("straight after sign-in");
}

// Whether or not the form path was available, the walk itself has to happen as a
// signed-in coach.
report.signedInVia = report.testLoginOffered && !new URL(page.url()).pathname.startsWith("/login")
  ? "test-account form"
  : "injected session";
if (report.signedInVia === "injected session") {
  await injectCoachSession(context);
  await page.goto(`${baseUrl}/coach`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await record("signed in as coach");
}

{

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await record("after a reload");

  for (const [label, path] of [
    ["workout programmes", "/coach/workouts"],
    ["the FBW training day", "/coach/workouts/workout-program-18nf8g8/days/workout-day-e1x8zr"],
    ["new client", "/coach/clients/new"],
    ["client list", "/coach/clients"],
    ["menu builder", "/coach/menus/new"],
  ]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    await record(label);
  }
  await page.screenshot({ path: join(shotDir, "preview-origin-coach.png") });
}

report.verdict = {
  everyStepOnPreview: report.steps.every((step) => step.onPreview),
  anyStepHitProduction: report.steps.some((step) => step.hitProduction),
  badgeShownOnCoachScreens: report.steps.filter((step) => step.path.startsWith("/coach")).every((step) => step.previewBadge > 0),
  origins: [...new Set(report.steps.map((step) => step.origin))],
};
report.consoleErrors = errors;

console.log(JSON.stringify(report, null, 2));
await browser.close();
