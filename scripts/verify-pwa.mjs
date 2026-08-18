// Web/PWA audit: is START installable, does it come back as an app rather than a
// bookmark, does a signed-in session survive a reload, and does anything shout in
// the console on the routes a coach and a client actually use.
//
//   node scripts/verify-pwa.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-pwa.mjs <baseUrl> <screenshotDir>");

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
async function activateDevice(session, deviceId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_current_device`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ p_device_id: deviceId, p_device_name: "Playwright PWA" }),
  });
  if (!response.ok) throw new Error(`activate_current_device -> HTTP ${response.status}`);
}
const CHUNK = 3180;
const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const { hostname } = new URL(baseUrl);
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

// ------------------------------------------------------------ manifest
const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
const manifest = manifestResponse.ok ? await manifestResponse.json() : null;
const icons = [];
for (const icon of manifest?.icons ?? []) {
  const head = await fetch(new URL(icon.src, baseUrl));
  icons.push({ src: icon.src, sizes: icon.sizes, purpose: icon.purpose, status: head.status, type: head.headers.get("content-type") });
}
report.manifest = {
  status: manifestResponse.status,
  name: manifest?.name,
  display: manifest?.display,
  displayIsStandalone: manifest?.display === "standalone",
  start_url: manifest?.start_url,
  scope: manifest?.scope,
  lang: manifest?.lang,
  dir: manifest?.dir,
  hasAnyIcon: (manifest?.icons ?? []).some((i) => i.purpose === "any" || !i.purpose),
  hasMaskableIcon: (manifest?.icons ?? []).some((i) => (i.purpose ?? "").includes("maskable")),
  has192and512: ["192x192", "512x512"].every((s) => (manifest?.icons ?? []).some((i) => i.sizes === s)),
  icons,
  iconsAllServed: icons.every((i) => i.status === 200 && (i.type ?? "").includes("image")),
  shortcuts: (manifest?.shortcuts ?? []).map((s) => s.url),
};
// The three things Chrome requires before it will offer an install.
report.installability = {
  manifestServed: manifestResponse.ok,
  standalone: manifest?.display === "standalone",
  iconLargeEnoughServed: icons.some((i) => i.sizes === "512x512" && i.status === 200),
  startUrlInScope: (manifest?.start_url ?? "/").startsWith(manifest?.scope ?? "/"),
};

const browser = await chromium.launch();
const phone = { viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// ------------------------------------------------ service worker + document
const anon1 = await browser.newContext(phone);
const anonPage = await anon1.newPage();
await anonPage.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
await anonPage.waitForTimeout(2500);
report.document = await anonPage.evaluate(() => ({
  lang: document.documentElement.lang,
  dir: document.documentElement.getAttribute("dir"),
  manifestLink: document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? null,
  themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null,
  viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
}));
report.serviceWorker = await anonPage.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return { supported: false };
  const registration = await navigator.serviceWorker.getRegistration();
  return {
    supported: true,
    registered: Boolean(registration),
    scope: registration?.scope ?? null,
    controlling: Boolean(navigator.serviceWorker.controller),
  };
});
const swResponse = await fetch(`${baseUrl}/sw.js`);
const swText = swResponse.ok ? await swResponse.text() : "";
report.serviceWorkerFile = {
  status: swResponse.status,
  hasFetchHandler: /addEventListener\(\s*["']fetch["']/.test(swText),
  cachesAnything: /caches\.(open|match|put)/.test(swText),
};
await anon1.close();

// ----------------------------------------- session persistence + console
const routes = {
  coach: ["/coach", "/coach/workouts", "/coach/workouts/workout-program-18nf8g8/days/workout-day-e1x8zr"],
  client: ["/workouts", "/nutrition", "/progress"],
};
const consoleByRole = {};
const persistence = {};

for (const role of ["coach", "client"]) {
  const session = role === "coach"
    ? await signIn(env.E2E_COACH_EMAIL, env.E2E_COACH_PASSWORD)
    : await signIn(env.E2E_CLIENT_EMAIL, env.E2E_CLIENT_PASSWORD);
  const deviceId = `pwa-${role}-device-0001`;
  if (role === "client") await activateDevice(session, deviceId);
  const context = await browser.newContext(phone);
  await context.addCookies(sessionCookies(session, deviceId));
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  const visited = [];
  for (const route of routes[role]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    visited.push({ route, landedOn: new URL(page.url()).pathname, bouncedToLogin: page.url().includes("/login") });
  }

  // Session persistence: reload the last route and make sure it is still ours.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  persistence[role] = {
    afterReload: new URL(page.url()).pathname,
    stillSignedIn: !page.url().includes("/login"),
    visited,
  };
  await page.screenshot({ path: join(shotDir, `pwa-${role}.png`) });

  // Offline: what a client sees with no network. The worker caches nothing on
  // purpose, so this records the real behaviour rather than asserting a screen
  // that was never built.
  if (role === "client") {
    await context.setOffline(true);
    let offline = "navigation rejected";
    try {
      await page.goto(`${baseUrl}/workouts`, { waitUntil: "domcontentloaded", timeout: 15000 });
      offline = (await page.title()) || "(no title)";
    } catch (error) {
      offline = `navigation failed: ${String(error).slice(0, 80)}`;
    }
    report.offline = { behaviour: offline, note: "sw.js serves the static public offline page for a failed navigation; nothing per-user is cached" };
    await context.setOffline(false);
  }

  consoleByRole[role] = errors;
  await context.close();
}
report.persistence = persistence;
report.consoleErrors = consoleByRole;

console.log(JSON.stringify(report, null, 2));
await browser.close();
