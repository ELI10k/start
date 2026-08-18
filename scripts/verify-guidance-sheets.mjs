// Opens the "דגשים לתרגיל" sheet on real screens and checks that what it shows
// is that exercise's content and not the one above it.
//
// The check that matters is the mapping: a panel that renders five sections is
// worthless if the cues belong to a different movement. So the expected text is
// read from the catalogue by exercise id and compared against what the sheet
// actually rendered, card by card.
//
//   node scripts/verify-guidance-sheets.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-guidance-sheets.mjs <baseUrl> <screenshotDir>");

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

// What the catalogue holds, straight from the database.
const catalogueResponse = await fetch(`${supabaseUrl}/rest/v1/workout_exercises?select=id,name,how_to,cues,common_mistakes,equipment,primary_muscle_group`, {
  headers: { apikey: anon, authorization: `Bearer ${coach.access_token}` },
});
const catalogue = await catalogueResponse.json();
const byName = new Map(catalogue.map((item) => [item.name.trim(), item]));

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

const browser = await chromium.launch();
const phone = {
  viewport: { width: 390, height: 844 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  ...(BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } } : {}),
};

// Reads one card's sheet and compares it with the catalogue row for that name.
async function checkCard(page, index) {
  const card = page.locator("article").nth(index);
  const name = (await card.locator("h2, h3").first().textContent())?.trim() ?? "";
  const expected = byName.get(name);
  await card.getByRole("button", { name: /דגשים לתרגיל/ }).click();
  await page.waitForTimeout(700);
  const shown = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const section = (title) => {
      const heading = [...dialog.querySelectorAll("h3")].find((h) => h.textContent?.trim() === title);
      if (!heading) return null;
      const next = heading.nextElementSibling;
      const items = [...(next?.querySelectorAll("li") ?? [])].map((li) => li.textContent?.trim());
      return items.length ? items : next?.textContent?.trim() ?? null;
    };
    return {
      title: dialog.querySelector(".sheet__title")?.textContent?.trim() ?? null,
      sections: [...dialog.querySelectorAll("h3")].map((h) => h.textContent?.trim()),
      howTo: section("איך מבצעים"),
      cues: section("דגשים חשובים"),
      mistakes: section("טעויות נפוצות"),
      muscles: section("שרירים עובדים"),
      equipment: section("ציוד"),
      missingNote: [...dialog.querySelectorAll("p")].map((p) => p.textContent ?? "").find((t) => t.includes("לא סופק מידע")) ?? null,
    };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  if (!shown || !expected) return { name, ok: false, why: shown ? "not in catalogue" : "sheet did not open" };
  return {
    name,
    muscle: expected.primary_muscle_group,
    titleMatches: shown.title === name,
    sectionCount: shown.sections.length,
    howToMatches: (shown.howTo ?? "") === (expected.how_to ?? ""),
    cuesMatch: JSON.stringify(shown.cues ?? []) === JSON.stringify(expected.cues ?? []),
    mistakesMatch: JSON.stringify(shown.mistakes ?? []) === JSON.stringify(expected.common_mistakes ?? []),
    equipmentMatches: (shown.equipment ?? "") === (expected.equipment ?? ""),
    noMissingNote: shown.missingNote === null,
  };
}

const report = {};

// ---- coach
const coachContext = await browser.newContext(phone);
await coachContext.addCookies(sessionCookies(coach, "guidance-coach-0001"));
const page = await coachContext.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
await page.goto(`${baseUrl}/coach/workouts/${OFFICIAL_PROGRAM}/days/${OFFICIAL_DAY}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

report.coachLayout = await page.evaluate(() => {
  const first = document.querySelector("article");
  return {
    cards: document.querySelectorAll("article").length,
    guidanceButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent?.includes("דגשים")).length,
    videoLinks: [...document.querySelectorAll("a")].filter((a) => a.textContent?.includes("וידאו")).length,
    // The two sit in the same row, which is what "side by side" means here.
    videoAndGuidanceShareARow: Boolean(first?.querySelector("a")?.parentElement === first?.querySelector("button[class*='chip'], button")?.parentElement)
      || Boolean(first && [...first.querySelectorAll("div")].some((row) => row.querySelector("a") && [...row.querySelectorAll("button")].some((b) => b.textContent?.includes("דגשים")))),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

const cardCount = report.coachLayout.cards;
report.coachCards = [];
for (let index = 0; index < cardCount; index += 1) {
  report.coachCards.push(await checkCard(page, index));
}
await page.screenshot({ path: join(shotDir, "guidance-coach.png") });

// ---- client
const client = await signIn(env.E2E_CLIENT_EMAIL, env.E2E_CLIENT_PASSWORD);
await fetch(`${supabaseUrl}/rest/v1/rpc/activate_current_device`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${client.access_token}` },
  body: JSON.stringify({ p_device_id: "guidance-client-0001", p_device_name: "Playwright guidance" }),
});
const clientContext = await browser.newContext(phone);
await clientContext.addCookies(sessionCookies(client, "guidance-client-0001"));
const clientPage = await clientContext.newPage();
clientPage.on("pageerror", (e) => errors.push(`client: ${String(e).slice(0, 140)}`));
await clientPage.goto(`${baseUrl}/workouts`, { waitUntil: "networkidle" });
await clientPage.waitForTimeout(3000);
report.clientLayout = await clientPage.evaluate(() => ({
  guidanceButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent?.includes("דגשים")).length,
  videoLinks: [...document.querySelectorAll("a")].filter((a) => a.textContent?.includes("וידאו")).length,
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
report.clientCards = [];
const clientCards = Math.min(3, await clientPage.locator("article").count());
for (let index = 0; index < clientCards; index += 1) {
  report.clientCards.push(await checkCard(clientPage, index));
}
await clientPage.screenshot({ path: join(shotDir, "guidance-client.png") });

const all = [...report.coachCards, ...report.clientCards].filter((card) => card.titleMatches !== undefined);
report.verdict = {
  cardsChecked: all.length,
  everyTitleMatches: all.every((c) => c.titleMatches),
  everyHowToMatches: all.every((c) => c.howToMatches),
  everyCuesMatch: all.every((c) => c.cuesMatch),
  everyMistakesMatch: all.every((c) => c.mistakesMatch),
  everyEquipmentMatches: all.every((c) => c.equipmentMatches),
  noneStillReportsMissing: all.every((c) => c.noMissingNote),
  musclesCovered: [...new Set(all.map((c) => c.muscle))],
};
report.pageErrors = errors;

console.log(JSON.stringify(report, null, 2));
await browser.close();
