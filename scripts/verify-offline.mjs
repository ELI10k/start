// The offline behaviour, proved in a browser rather than argued from the source.
//
// The claim that matters is negative: after signing in and browsing the screens
// that hit Supabase and the private API, Cache Storage still holds nothing but a
// static page and four icons. A regex over sw.js cannot show that. Enumerating
// the real cache after real traffic can.
//
//   node scripts/verify-offline.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-offline.mjs <baseUrl> <screenshotDir>");

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

async function signIn(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`sign-in failed for ${email} (HTTP ${response.status})`);
  const raw = await response.json();
  return { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };
}

const CHUNK = 3180;
const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
function sessionCookies(session, deviceId) {
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const parts = [];
  if (encoded.length <= CHUNK) parts.push({ name: cookieName, value: encoded });
  else for (let i = 0; i * CHUNK < encoded.length; i += 1)
    parts.push({ name: `${cookieName}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
  parts.push({ name: "start-device-id", value: deviceId });
  return parts.map((p) => ({ ...p, domain: hostname, path: "/", httpOnly: false, secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: session.expires_at }));
}

const report = {};
const browser = await chromium.launch();
const phone = { viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const coach = await signIn(env.E2E_COACH_EMAIL, env.E2E_COACH_PASSWORD);
const context = await browser.newContext(phone);
await context.addCookies(sessionCookies(coach, "offline-qa-device-0001"));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

const waitForController = () => page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return { supported: false };
  const registration = await navigator.serviceWorker.ready;
  // clients.claim() can land just after ready resolves.
  for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { supported: true, scope: registration.scope, controlling: Boolean(navigator.serviceWorker.controller) };
});

// ---- a stale cache from a previous version, to prove activate clears it
await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  const stale = await caches.open("start-public-v0");
  await stale.put("/offline.html", new Response("stale shell", { headers: { "content-type": "text/html" } }));
  const foreign = await caches.open("something-else-v1");
  await foreign.put("/keep-me", new Response("not ours"));
});
report.seededCaches = await page.evaluate(() => caches.keys());

// Cleanup happens in activate, and activate only runs for a worker that is not
// already running. A plain reload leaves the current one in place - which is
// correct, and is why proving the cleanup means installing a fresh one, the way
// a deploy does.
await page.evaluate(async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
});
await page.reload({ waitUntil: "networkidle" });
report.serviceWorker = await waitForController();
await page.waitForTimeout(2500);
report.cachesAfterActivate = await page.evaluate(() => caches.keys());

// ---- real authenticated traffic, then look at what was kept
for (const route of ["/coach", "/coach/workouts", "/coach/menus/new", "/coach/clients"]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
}

report.cacheAudit = await page.evaluate(async () => {
  const keys = await caches.keys();
  const entries = {};
  for (const key of keys) {
    const cache = await caches.open(key);
    entries[key] = (await cache.keys()).map((request) => request.url);
  }
  return entries;
});

const allCached = Object.values(report.cacheAudit).flat();
report.cacheVerdict = {
  totalEntries: allCached.length,
  anySupabase: allCached.filter((url) => url.includes("supabase.co")),
  anyApi: allCached.filter((url) => /\/api\//.test(url)),
  anyAppHtml: allCached.filter((url) => /\/coach|\/workouts|\/nutrition|\/login/.test(url)),
  anyNextChunk: allCached.filter((url) => url.includes("/_next/")),
};

// ---- offline: a navigation must land on START's own page
await context.setOffline(true);
await page.goto(`${baseUrl}/coach/workouts`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
await page.waitForTimeout(1500);
report.offlineNavigation = await page.evaluate(() => ({
  url: location.pathname,
  dir: document.documentElement.getAttribute("dir"),
  lang: document.documentElement.lang,
  heading: document.querySelector("h1")?.textContent ?? null,
  hasRetry: Boolean([...document.querySelectorAll("button")].find((b) => b.textContent?.includes("נסה שוב"))),
  documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  saysItNeedsConnection: document.body.innerText.includes("START דורש חיבור לאינטרנט"),
  showsNoStoredData: !/ק״ג|קלוריות|סטים/.test(document.body.innerText),
}));
await page.screenshot({ path: join(shotDir, "offline-375.png"), fullPage: true });

// Retry while still offline: it must say so and stay put, not blank the screen.
if (report.offlineNavigation.hasRetry) {
  // A marker that does not survive a navigation, so a silently reloading page is
  // told apart from a handler that never fired.
  await page.evaluate(() => { window.__beforeRetry = true; });
  await page.getByRole("button", { name: "נסה שוב" }).click();
  await page.waitForTimeout(1200);
  report.retryImmediate = await page.evaluate(() => ({
    documentSurvived: window.__beforeRetry === true,
    scriptRan: typeof window.attempt,
    scriptTags: document.querySelectorAll("script").length,
    status: document.getElementById("status")?.textContent ?? null,
    disabled: document.getElementById("retry")?.disabled ?? null,
  }));
  const settled = await page
    .waitForFunction(() => (document.getElementById("status")?.textContent ?? "").includes("עדיין אין חיבור"), null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  report.retryWhileOffline = {
    reportedNoConnection: settled,
    stillOnOfflinePage: await page.evaluate(() => Boolean(document.querySelector("h1")?.textContent?.includes("אין חיבור"))),
    status: await page.evaluate(() => document.getElementById("status")?.textContent ?? null),
    buttonUsableAgain: await page.evaluate(() => !document.getElementById("retry")?.disabled),
  };
}

// The session cookie must survive the outage untouched.
report.cookieSurvivedOffline = (await context.cookies()).some((c) => c.name.startsWith(cookieName));

// ---- back online: retry returns to the page they were heading for
await context.setOffline(false);
await page.waitForTimeout(500);
if (report.offlineNavigation.hasRetry) {
  await page.getByRole("button", { name: "נסה שוב" }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(3000);
}
report.afterReconnect = {
  url: new URL(page.url()).pathname,
  backOnTheApp: !(await page.evaluate(() => Boolean(document.querySelector("h1")?.textContent?.includes("אין חיבור")))),
  stillSignedIn: !page.url().includes("/login"),
};
await page.screenshot({ path: join(shotDir, "offline-recovered-375.png"), fullPage: true });

report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
