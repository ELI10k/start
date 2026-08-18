// Phone-width QA for the workout screens: the "דגשים לתרגיל" sheet, the three
// ways it closes, whether the page can scroll again afterwards, and whether any
// control is pushed off a 375px screen.
//
// The earlier run reported the backdrop tap as broken. That measurement used a
// forced click at the backdrop's centre - which is underneath the sheet, because
// the sheet is up to 85dvh tall. This clicks the strip of backdrop genuinely
// above the sheet, so the result reflects the product rather than the harness.
//
//   node scripts/verify-mobile-qa.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-mobile-qa.mjs <baseUrl> <screenshotDir>");

const OFFICIAL_PROGRAM = "workout-program-18nf8g8";
const OFFICIAL_DAY = "workout-day-e1x8zr";

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
  if (!response.ok) throw new Error(`Supabase rejected the sign-in for ${email} (HTTP ${response.status}).`);
  const raw = await response.json();
  return { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };
}

async function activateDevice(session, deviceId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_current_device`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ p_device_id: deviceId, p_device_name: "Playwright QA" }),
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
  return parts.map((part) => ({
    ...part, domain: hostname, path: "/", httpOnly: false,
    secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: session.expires_at,
  }));
}

// A deployed preview sits behind Vercel's SSO. The secret is resolved from the
// Vercel API using the CLI's own login rather than passed in, so it never reaches
// a command line or a log, and it is skipped entirely for a local server.
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
    return Object.entries(body.protectionBypass ?? {}).find(([, meta]) => meta.scope === "automation-bypass")?.[0] ?? "";
  } catch {
    return "";
  }
}
const BYPASS = remote ? await bypassSecret() : "";
const passGate = async (page) => {
  if (!BYPASS) return;
  await page.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "domcontentloaded" });
};

const report = {};
const browser = await chromium.launch();
const phone = { viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// Anything wider than the screen, or with a tap target under 44px.
const layoutProbe = () => ({
  dir: document.documentElement.getAttribute("dir"),
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
  offscreen: [...document.querySelectorAll("button, a, input, select")]
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && box.height > 0 && (box.right > window.innerWidth + 1 || box.left < -1))
    .map(({ el, box }) => {
      // Off the viewport is only a defect if it cannot be brought back. A control
      // inside a horizontal scroller is reachable; one inside a clipped or fixed
      // box is lost.
      let scroller = null;
      for (let node = el.parentElement; node && !scroller; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) scroller = node;
        else if (style.overflowX === "hidden" && node.scrollWidth > node.clientWidth + 1) scroller = node;
      }
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30),
        left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
        reachable: Boolean(scroller) && /(auto|scroll)/.test(scroller ? getComputedStyle(scroller).overflowX : ""),
        scrollerOverflowX: scroller ? getComputedStyle(scroller).overflowX : null,
        scrollerClass: scroller ? (scroller.className?.baseVal ?? scroller.className ?? "").toString().slice(0, 50) : null,
      };
    }),
  shortTargets: [...document.querySelectorAll("button, a")]
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < 44)
    .map(({ el, box }) => ({ label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24), h: Math.round(box.height) })),
});

const overflowState = () => ({
  inlineOverflow: document.body.style.overflow,
  computedOverflow: getComputedStyle(document.body).overflow,
  dialogs: document.querySelectorAll('[role="dialog"]').length,
});

// ------------------------------------------------------------------ coach
const coach = await signIn(env.E2E_COACH_EMAIL, env.E2E_COACH_PASSWORD);
const coachContext = await browser.newContext(phone);
await coachContext.addCookies(sessionCookies(coach, "qa-coach-device-0001"));
const page = await coachContext.newPage();
const coachConsole = [];
page.on("console", (m) => { if (m.type() === "error") coachConsole.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => coachConsole.push(`pageerror: ${String(e).slice(0, 200)}`));

await passGate(page);
await page.goto(`${baseUrl}/coach/workouts/${OFFICIAL_PROGRAM}/days/${OFFICIAL_DAY}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

report.coachLayout = await page.evaluate(layoutProbe);
report.coachBaselineOverflow = await page.evaluate(overflowState);

const openSheet = async () => {
  await page.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
  await page.waitForTimeout(700);
};

// close 1: the סגירה button
await openSheet();
const sheetShape = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const b = d?.getBoundingClientRect();
  return { top: Math.round(b?.top ?? -1), height: Math.round(b?.height ?? -1), viewport: window.innerHeight, sections: [...(d?.querySelectorAll("h3") ?? [])].map((h) => h.textContent) };
});
await page.getByRole("button", { name: "סגירה" }).click();
await page.waitForTimeout(500);
report.closeByButton = { ...(await page.evaluate(overflowState)), sheetShape };

// close 2: Escape
await openSheet();
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
report.closeByEscape = await page.evaluate(overflowState);

// close 3: the backdrop, tapped where it is actually exposed - above the sheet.
await openSheet();
const backdropPoint = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const top = d?.getBoundingClientRect().top ?? 0;
  return { x: Math.round(window.innerWidth / 2), y: Math.max(4, Math.round(top / 2)) };
});
await page.mouse.click(backdropPoint.x, backdropPoint.y);
await page.waitForTimeout(500);
report.closeByBackdrop = { ...(await page.evaluate(overflowState)), tappedAt: backdropPoint };

// The sheet must not force the page sideways while it is open either.
await openSheet();
report.layoutWithSheetOpen = await page.evaluate(layoutProbe);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

await page.screenshot({ path: join(shotDir, "qa-coach-375.png") });
report.coachConsoleErrors = coachConsole;

// ----------------------------------------------------------------- client
const client = await signIn(env.E2E_CLIENT_EMAIL, env.E2E_CLIENT_PASSWORD);
const deviceId = "qa-client-device-0001";
await activateDevice(client, deviceId);
const clientContext = await browser.newContext(phone);
await clientContext.addCookies(sessionCookies(client, deviceId));
const clientPage = await clientContext.newPage();
const clientConsole = [];
clientPage.on("console", (m) => { if (m.type() === "error") clientConsole.push(m.text().slice(0, 200)); });
clientPage.on("pageerror", (e) => clientConsole.push(`pageerror: ${String(e).slice(0, 200)}`));

await passGate(clientPage);
await clientPage.goto(`${baseUrl}/workouts`, { waitUntil: "networkidle" });
await clientPage.waitForTimeout(3000);

report.clientToday = {
  url: clientPage.url(),
  heading: await clientPage.locator("h1").first().textContent().catch(() => null),
  guidanceButtons: await clientPage.getByRole("button", { name: /דגשים לתרגיל/ }).count(),
  videoLinks: await clientPage.getByRole("link", { name: /וידאו|סרטון/ }).count(),
  muscleTags: await clientPage.locator(".pill--green").allTextContents(),
  layout: await clientPage.evaluate(layoutProbe),
};

if (report.clientToday.guidanceButtons > 0) {
  await clientPage.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
  await clientPage.waitForTimeout(700);
  report.clientSheet = await clientPage.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { open: false };
    const box = d.getBoundingClientRect();
    return {
      open: true,
      title: d.querySelector(".sheet__title")?.textContent ?? null,
      sections: [...d.querySelectorAll("h3")].map((h) => h.textContent),
      hasImage: Boolean(d.querySelector("img")),
      imagePlaceholder: d.innerText.includes("לא הועלתה תמונה"),
      missingNote: [...d.querySelectorAll("p")].map((p) => p.textContent ?? "").find((t) => t.includes("לא סופק מידע")) ?? null,
      withinViewport: box.left >= -1 && box.right <= window.innerWidth + 1,
    };
  });
  await clientPage.screenshot({ path: join(shotDir, "qa-client-sheet-375.png") });
  await clientPage.keyboard.press("Escape");
  await clientPage.waitForTimeout(400);
  report.clientSheetClosed = await clientPage.evaluate(overflowState);
}

await clientPage.screenshot({ path: join(shotDir, "qa-client-375.png") });
report.clientConsoleErrors = clientConsole;

console.log(JSON.stringify(report, null, 2));
await browser.close();
