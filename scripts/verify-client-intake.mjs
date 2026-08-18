// The gap this change closes, driven through the real screens: a client created
// before the calorie columns existed has no age, sex, steps, goal or level, so
// the builder can only name what is missing. A coach fills them in on the client
// card, and the builder computes.
//
// Runs against the E2E test client and puts every field back exactly as it found
// it, so it can be run repeatedly without leaving a trace.
//
//   node scripts/verify-client-intake.mjs <baseUrl> <clientId> <screenshotDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, clientId, shotDir] = process.argv.slice(2);
if (!baseUrl || !clientId || !shotDir) throw new Error("usage: verify-client-intake.mjs <baseUrl> <clientId> <screenshotDir>");

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
parts.push({ name: "start-device-id", value: "intake-qa-device-0001" });

const report = {};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await context.addCookies(parts.map((p) => ({ ...p, domain: hostname, path: "/", httpOnly: false, secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: session.expires_at })));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

const openIntake = async () => {
  await page.goto(`${baseUrl}/coach/clients/${clientId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // The section is a <details>; open it before anything inside can be measured.
  const section = page.locator("details", { hasText: "נתוני קליטה" }).first();
  await section.locator("summary").first().click();
  await page.waitForTimeout(600);
  return section;
};

const readPanel = () => page.evaluate(() => {
  const text = document.body.innerText;
  const chain = ["BMR", "מקדם פעילות", "הוצאה יומית", "יעד לפי המטרה"].filter((label) => text.includes(label));
  const missing = (text.match(/עדיין לא ניתן לחשב יעד קלורי\. חסר: ([^\n.]+)/) ?? [])[1] ?? null;
  const target = (text.match(/יעד לפי המטרה\s*\n?\s*([\d,]+) קל׳/) ?? [])[1] ?? null;
  return { chainLabelsShown: chain, missing, calorieTarget: target, recommendation: /תוכניות מומלצות לרמת/.test(text), recommendationOnly: text.includes("המלצה בלבד") };
});

// ---- before: what a client with no intake actually sees
await openIntake();
report.before = await readPanel();
report.layout = await page.evaluate(() => ({
  dir: document.documentElement.getAttribute("dir"),
  documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  offscreenFormControls: [...document.querySelectorAll("form input, form select, form button")]
    .map((el) => el.getBoundingClientRect())
    .filter((b) => b.width > 0 && (b.right > window.innerWidth + 1 || b.left < -1)).length,
  shortTargets: [...document.querySelectorAll("form input, form select, form button")]
    .map((el) => el.getBoundingClientRect())
    .filter((b) => b.width > 0 && b.height > 0 && b.height < 44).length,
}));
await page.screenshot({ path: join(shotDir, "intake-before-375.png"), fullPage: true });

// ---- fill it in
const fill = async (values) => {
  await page.getByLabel("גיל", { exact: true }).fill(values.age);
  await page.getByLabel("מין", { exact: true }).selectOption(values.sex);
  await page.getByLabel("גובה (ס״מ)", { exact: true }).fill(values.height);
  await page.getByLabel("ממוצע צעדים יומי", { exact: true }).fill(values.steps);
  await page.getByLabel("אימונים בשבוע", { exact: true }).fill(values.workouts);
  await page.getByLabel("מטרה", { exact: true }).selectOption(values.goal);
  await page.getByLabel("רמת מתאמן", { exact: true }).selectOption(values.level);
  await page.getByRole("button", { name: /שמירת נתוני הקליטה/ }).click();
  await page.waitForTimeout(4000);
};

await fill({ age: "30", sex: "male", height: "180", steps: "8000", workouts: "3", goal: "gentle_cut", level: "intermediate" });
report.saveMessage = await page.locator('[role="status"]').first().textContent().catch(() => null);
await openIntake();
report.after = await readPanel();
await page.screenshot({ path: join(shotDir, "intake-after-375.png"), fullPage: true });

// ---- the builder now computes for this client
await page.goto(`${baseUrl}/coach/menus/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.getByLabel("לקוח").selectOption(clientId);
await page.waitForTimeout(2500);
report.builder = await page.evaluate(() => {
  const text = document.body.innerText;
  const value = (label) => document.querySelector(`input[aria-label="${label}"]`)?.value ?? null;
  return {
    chainShown: ["BMR", "מקדם פעילות", "הוצאה יומית", "יעד לפי המטרה"].every((l) => text.includes(l)),
    calories: value("יעד קלוריות"),
    protein: value("יעד חלבון"),
    carbs: value("יעד פחמימות"),
    fat: value("יעד שומן"),
  };
});
await page.screenshot({ path: join(shotDir, "intake-builder-375.png"), fullPage: true });

// ---- put it back exactly as it was: every field empty
await openIntake();
await page.getByLabel("גיל", { exact: true }).fill("");
await page.getByLabel("מין", { exact: true }).selectOption("");
await page.getByLabel("גובה (ס״מ)", { exact: true }).fill("");
await page.getByLabel("ממוצע צעדים יומי", { exact: true }).fill("");
await page.getByLabel("אימונים בשבוע", { exact: true }).fill("");
await page.getByLabel("מטרה", { exact: true }).selectOption("");
await page.getByLabel("רמת מתאמן", { exact: true }).selectOption("");
await page.getByRole("button", { name: /שמירת נתוני הקליטה/ }).click();
await page.waitForTimeout(4000);
await openIntake();
report.restored = await readPanel();

report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
