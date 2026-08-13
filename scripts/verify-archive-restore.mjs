// Archive a client, prove nothing else moved, restore them, prove they are back.
//
// Runs against the E2E fixture client, never a real one, and it captures the
// full relationship row plus a count of everything that client owns before and
// after - so "no data was deleted" is measured rather than asserted. It restores
// at the end and fails loudly if the restore did not take.
//
//   node scripts/verify-archive-restore.mjs <baseUrl> <clientId> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, clientId, shotDir] = process.argv.slice(2);
if (!baseUrl || !clientId || !shotDir) throw new Error("usage: <baseUrl> <clientId> <screenshotDir>");

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

const grant = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`coach sign-in failed (HTTP ${grant.status})`);
const raw = await grant.json();
const coach = { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };
const rest = async (path) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: { apikey: anon, authorization: `Bearer ${coach.access_token}`, prefer: "count=exact" } });
  if (!response.ok) throw new Error(`${path.split("?")[0]} -> HTTP ${response.status}`);
  return response.json();
};

// Everything this client owns that a deletion would have taken.
const census = async () => ({
  relationship: (await rest(`coach_client_relationships?client_id=eq.${clientId}&select=coach_id,status,start_date,end_date`))[0] ?? null,
  profile: (await rest(`profiles?id=eq.${clientId}&select=id,status,full_name`))[0] ?? null,
  progress: (await rest(`progress_entries?client_id=eq.${clientId}&select=id`)).length,
  checkIns: (await rest(`check_ins?client_id=eq.${clientId}&select=id`)).length,
  assignments: (await rest(`workout_assignments?client_id=eq.${clientId}&select=id`)).length,
  sessions: (await rest(`workout_sessions?client_id=eq.${clientId}&select=id`)).length,
  notes: (await rest(`coach_client_notes?client_id=eq.${clientId}&select=id`)).length,
});

const report = { before: await census() };
if (report.before.relationship?.status !== "active") {
  throw new Error(`the fixture is not in the expected state: ${JSON.stringify(report.before.relationship)}`);
}

const CHUNK = 3180;
const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const encoded = `base64-${Buffer.from(JSON.stringify(coach), "utf8").toString("base64")}`;
const parts = [];
if (encoded.length <= CHUNK) parts.push({ name: cookieName, value: encoded });
else for (let i = 0; i * CHUNK < encoded.length; i += 1) parts.push({ name: `${cookieName}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
parts.push({ name: "start-device-id", value: "archive-qa-0001" });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  ...(BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } } : {}),
});
await context.addCookies(parts.map((p) => ({ ...p, domain: hostname, path: "/", httpOnly: false, secure: baseUrl.startsWith("https://"), sameSite: "Lax", expires: coach.expires_at })));
const page = await context.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("behind a redirect")) errors.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

try {
  // ---- archive, through the screen
  await page.goto(`${baseUrl}/coach/clients/${clientId}?tab=overview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  report.dangerZoneVisible = await page.getByRole("heading", { name: "אזור מסוכן" }).count();
  await page.getByRole("button", { name: /העברת לקוח לארכיון/ }).click();
  await page.waitForTimeout(500);
  report.confirmation = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      namesTheClient: /להעביר את .+ לארכיון\?/.test(text),
      saysNothingIsDeleted: text.includes("לא יימחקו"),
      avoidsTheWordDelete: !/מחיקת לקוח/.test(text),
    };
  });
  await page.screenshot({ path: join(shotDir, "archive-confirm.png"), fullPage: true });
  await page.getByRole("button", { name: /אישור והעברה לארכיון/ }).click();
  await page.waitForTimeout(4000);

  report.afterArchive = await census();
  report.activeListAfterArchive = await page.goto(`${baseUrl}/coach/clients`, { waitUntil: "networkidle" })
    .then(() => page.waitForTimeout(2000))
    .then(() => page.evaluate((id) => ({
      rows: document.querySelectorAll(".app-list a").length,
      containsClient: [...document.querySelectorAll(".app-list a")].some((row) => row.getAttribute("href")?.endsWith(id)),
    }), clientId));

  await page.goto(`${baseUrl}/coach/clients?view=archived`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  report.archiveList = await page.evaluate((id) => ({
    cards: document.querySelectorAll("article").length,
    containsClient: document.body.innerText.length > 0 && [...document.querySelectorAll("a")].some((a) => a.getAttribute("href")?.endsWith(id)),
    showsArchivedDate: /הועבר לארכיון/.test(document.body.innerText),
    showsStartDate: /תחילת ליווי/.test(document.body.innerText),
    hasRestore: [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("שחזור לקוח")),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), clientId);
  await page.screenshot({ path: join(shotDir, "archive-list.png"), fullPage: true });

  // ---- restore, through the screen
  await page.getByRole("button", { name: /שחזור לקוח/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "אישור" }).first().click();
  await page.waitForTimeout(4000);
} catch (error) {
  // Captured rather than thrown: a failure here must still print the state, or
  // the fixture is left archived and nobody finds out from the output.
  report.error = String(error).slice(0, 300);
} finally {
  // Whatever happened above, the fixture goes back to active.
  report.after = await census();
  // Loud, and last, so it cannot be missed in the output.
  if (report.after.relationship?.status !== "active") report.RESTORE_FAILED_FIXTURE_LEFT_ARCHIVED = true;
  await browser.close();
}

report.verdict = {
  archivedThenRestored: report.before.relationship?.status === "active" && report.afterArchive?.relationship?.status === "ended" && report.after.relationship?.status === "active",
  endDateSetThenCleared: report.afterArchive?.relationship?.end_date !== null && report.after.relationship?.end_date === null,
  profileStatusUntouched: report.before.profile?.status === report.afterArchive?.profile?.status && report.before.profile?.status === report.after.profile?.status,
  nothingDeleted: ["progress", "checkIns", "assignments", "sessions", "notes"].every((key) =>
    report.before[key] === report.afterArchive[key] && report.before[key] === report.after[key]),
  removedFromActiveList: report.activeListAfterArchive?.containsClient === false,
  appearsInArchive: report.archiveList?.containsClient === true,
  fixtureLeftActive: report.after.relationship?.status === "active",
};
report.consoleErrors = errors;

console.log(JSON.stringify(report, null, 2));
