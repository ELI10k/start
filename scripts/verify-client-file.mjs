// The client file: seven tabs, one client.
//
// The check that matters most is the boring one - that every tab is still the
// client you opened. A dossier that quietly shows another client's menu is worse
// than no dossier, so each tab is opened by direct URL and the name on screen is
// compared against the name the id belongs to.
//
//   node scripts/verify-client-file.mjs <baseUrl> <clientId> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, clientId, shotDir] = process.argv.slice(2);
if (!baseUrl || !clientId || !shotDir) throw new Error("usage: <baseUrl> <clientId> <screenshotDir>");

const TABS = ["overview", "intake", "nutrition", "workouts", "progress", "report", "notes"];

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
    const response = await fetch(`https://api.vercel.com/v9/projects/${project.projectName}?teamId=${project.orgId}`, { headers: { authorization: `Bearer ${auth.token}` } });
    if (!response.ok) return "";
    const body = await response.json();
    return Object.entries(body.protectionBypass ?? {}).find(([, meta]) => meta.scope === "automation-bypass")?.[0] ?? "";
  } catch { return ""; }
}
const BYPASS = /^(localhost|127\.0\.0\.1)$/.test(hostname) ? "" : await bypassSecret();

async function signIn(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`sign-in failed (HTTP ${response.status})`);
  const raw = await response.json();
  return { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };
}
const coach = await signIn(env.E2E_COACH_EMAIL, env.E2E_COACH_PASSWORD);

const expected = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${clientId}&select=full_name`, {
  headers: { apikey: anon, authorization: `Bearer ${coach.access_token}` },
}).then((r) => r.json()).then((rows) => rows[0]?.full_name ?? null);

const CHUNK = 3180;
const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
function cookies(session, deviceId) {
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const parts = [];
  if (encoded.length <= CHUNK) parts.push({ name: cookieName, value: encoded });
  else for (let i = 0; i * CHUNK < encoded.length; i += 1)
    parts.push({ name: `${cookieName}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
  parts.push({ name: "start-device-id", value: deviceId });
  return parts.map((p) => ({ ...p, domain: hostname, path: "/", httpOnly: false, secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: session.expires_at }));
}

const report = { expectedClient: expected, tabs: [] };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  ...(BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } } : {}),
});
await context.addCookies(cookies(coach, "file-qa-0001"));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("behind a redirect")) errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

// Opening from the list: the row is one link, so the name and the chevron are
// the same target.
await page.goto(`${baseUrl}/coach/clients`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
report.list = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".app-list a")];
  return {
    rows: rows.length,
    everyRowIsALink: rows.every((row) => row.getAttribute("href")?.startsWith("/coach/clients/")),
    nestedInteractive: rows.filter((row) => row.querySelector("button, a")).length,
    hasOpenLabel: rows.some((row) => row.textContent?.includes("פתיחת תיק")),
    searchKept: Boolean(document.querySelector('input[name="q"]')),
    sortKept: document.querySelectorAll('.chip-row a').length,
  };
});
const firstRow = page.locator(".app-list a").first();
const firstHref = await firstRow.getAttribute("href");
await firstRow.click();
await page.waitForTimeout(2000);
report.openedFromList = { href: firstHref, landedOn: new URL(page.url()).pathname, opened: new URL(page.url()).pathname.startsWith("/coach/clients/") };

for (const tab of TABS) {
  await page.goto(`${baseUrl}/coach/clients/${clientId}?tab=${tab}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    current: document.querySelector('nav[aria-label="מדורי תיק הלקוח"] [aria-current="page"]')?.textContent?.trim() ?? null,
    tabCount: document.querySelectorAll('nav[aria-label="מדורי תיק הלקוח"] a').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    dir: document.documentElement.getAttribute("dir"),
    previewBadge: document.querySelectorAll('[data-testid="preview-badge"]').length,
    shortTargets: [...document.querySelectorAll("main a, main button")]
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0 && b.height < 44).length,
    bodyLength: document.querySelector("main")?.innerText.length ?? 0,
  }));
  report.tabs.push({ tab, ...seen, showsExpectedClient: seen.heading === report.expectedClient });
  await page.screenshot({ path: join(shotDir, `client-file-${tab}.png`), fullPage: true });
}

report.verdict = {
  everyTabShowsTheSameClient: report.tabs.every((t) => t.showsExpectedClient),
  everyTabHasSevenTabs: report.tabs.every((t) => t.tabCount === 7),
  everyTabMarksItselfCurrent: report.tabs.every((t) => t.current !== null),
  noHorizontalOverflow: report.tabs.every((t) => t.overflow === 0),
  everyTabRtl: report.tabs.every((t) => t.dir === "rtl"),
  previewBadgeEverywhere: report.tabs.every((t) => t.previewBadge === 1),
  noShortTapTargets: report.tabs.every((t) => t.shortTargets === 0),
  everyTabHasContent: report.tabs.every((t) => t.bodyLength > 200),
};
report.consoleErrors = errors;

console.log(JSON.stringify(report, null, 2));
await browser.close();
