// The two screens this change touched, at the width most coaches actually use.
// Checks the things a Hebrew form gets wrong first: a control wider than the
// screen, a page that scrolls sideways, a tap target under 44px, a select whose
// accessible name swallowed every option, and a field that lost its label.
//
//   node scripts/verify-form-layout.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-form-layout.mjs <baseUrl> <screenshotDir>");

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

const remote = !/^(localhost|127\.0\.0\.1)$/.test(hostname);
async function bypassSecret() {
  try {
    const auth = JSON.parse(readFileSync(join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"), "utf8"));
    const project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
    const response = await fetch(`https://api.vercel.com/v9/projects/${project.projectName}?teamId=${project.orgId}`, {
      headers: { authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return "";
    const body = await response.json();
    return Object.entries(body.protectionBypass ?? {}).find(([, m]) => m.scope === "automation-bypass")?.[0] ?? "";
  } catch { return ""; }
}
const BYPASS = remote ? await bypassSecret() : "";

const grant = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`coach sign-in failed (HTTP ${grant.status})`);
const raw = await grant.json();
const session = { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };

const CHUNK = 3180;
const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
const parts = [];
if (encoded.length <= CHUNK) parts.push({ name: cookieName, value: encoded });
else for (let i = 0; i * CHUNK < encoded.length; i += 1)
  parts.push({ name: `${cookieName}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
parts.push({ name: "start-device-id", value: "form-qa-device-0001" });

const probe = () => {
  const overflowing = [...document.querySelectorAll("input, select, textarea, button, a, label")]
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && box.height > 0 && (box.right > window.innerWidth + 1 || box.left < -1));
  return {
    dir: document.documentElement.getAttribute("dir"),
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    overflowingControls: overflowing.map(({ el, box }) => ({
      tag: el.tagName.toLowerCase(),
      name: el.getAttribute("name") ?? (el.textContent ?? "").trim().slice(0, 24),
      left: Math.round(box.left), right: Math.round(box.right),
    })),
    // A select wrapped in a <label> takes the whole label - options included - as
    // its accessible name unless it carries its own aria-label.
    selects: [...document.querySelectorAll("select")].map((el) => ({
      name: el.getAttribute("name"),
      ariaLabel: el.getAttribute("aria-label"),
      options: [...el.options].map((o) => o.textContent?.trim()).filter(Boolean),
    })),
    // React's server-action plumbing renders hidden $ACTION_* inputs. They are
    // framework internals, not fields a coach ever sees.
    unlabelledFields: [...document.querySelectorAll("input, textarea")]
      .filter((el) => !el.getAttribute("aria-label") && !el.closest("label") && !document.querySelector(`label[for="${el.id}"]`))
      .map((el) => el.getAttribute("name"))
      .filter((name) => name && !name.startsWith("$ACTION")),
    shortTargets: [...document.querySelectorAll("button, a, input, select")]
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < 44)
      .map(({ el, box }) => ({ name: el.getAttribute("name") ?? (el.textContent ?? "").trim().slice(0, 20), h: Math.round(box.height) })),
    removedFieldsStillPresent: ["birthDate", "dateOfBirth", "activityLevel", "dietaryPreferences", "dislikedFoods"]
      .filter((name) => document.querySelector(`[name="${name}"]`)),
  };
};

const report = {};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await context.addCookies(parts.map((p) => ({ ...p, domain: hostname, path: "/", httpOnly: false, secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: session.expires_at })));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
if (BYPASS) await page.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "domcontentloaded" });

for (const [key, route] of [["createClient", "/coach/clients/new"], ["menuBuilder", "/coach/menus/new"]]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  report[key] = { route, ...(await page.evaluate(probe)) };
  await page.screenshot({ path: join(shotDir, `form-${key}-375.png`), fullPage: true });
}

report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
