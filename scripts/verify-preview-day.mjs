// Opens the coach's training-day screen on a deployed START and reports what is
// actually on it: the "דגשים" button, the muscle-group tag, and whether sets /
// reps / rest are editable inputs or read-only text.
//
// Two hosts to get past: Vercel's SSO on preview deployments (handled with the
// project's automation-bypass token) and START's own login (handled with a
// Supabase password grant in Node, so the credential never reaches the browser -
// same approach as e2e/support/session.ts).
//
//   node scripts/verify-preview-day.mjs <baseUrl> <programId> <dayId> <outfile>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, programId, dayId, outfile] = process.argv.slice(2);
if (!baseUrl || !programId || !dayId || !outfile) {
  throw new Error("usage: verify-preview-day.mjs <baseUrl> <programId> <dayId> <outfile>");
}

// Only a Vercel preview is behind SSO. Sending the bypass secret to a local dev
// server would write it into that server's request log for nothing.
//
// Resolved from the Vercel API using the CLI's own login rather than taken as an
// argument, so the secret never appears in a command line, a shell history or a
// log. It is held here and never printed.
const remote = !/^(localhost|127\.0\.0\.1)$/.test(new URL(baseUrl).hostname);
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

// With --attempt-save the script types into one card's prescription fields and
// presses save, then reloads and reports what survived. Used both to tell a UI
// that cannot offer the edit apart from a database that refuses it, and to put a
// test value back afterwards.
//
//   --attempt-save --index 1 --sets 4 --reps 10 --rest "2 דקות" --notes ""
const ATTEMPT_SAVE = process.argv.includes("--attempt-save");
const flag = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};
const CARD = Number(flag("index") ?? 0);

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

const grant = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`Supabase rejected the E2E coach sign-in (HTTP ${grant.status}).`);
const raw = await grant.json();
const session = { ...raw, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + raw.expires_in };

// @supabase/ssr splits the cookie into `.0`, `.1`, … chunks past this size.
const CHUNK = 3180;
const name = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
const { hostname } = new URL(baseUrl);
const cookies = [];
if (encoded.length <= CHUNK) cookies.push({ name, value: encoded });
else for (let i = 0; i * CHUNK < encoded.length; i += 1)
  cookies.push({ name: `${name}.${i}`, value: encoded.slice(i * CHUNK, (i + 1) * CHUNK) });
cookies.push({ name: "start-device-id", value: `e2e-verify-${programId}`.padEnd(20, "x") });

const browser = await chromium.launch();
// The header form rather than the cookie: the set-bypass-cookie round trip does
// not survive every deployment, and this applies to sub-requests too.
const context = await browser.newContext({
  viewport: { width: 1280, height: 1200 },
  locale: "he-IL",
  ...(BYPASS ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } } : {}),
});
await context.addCookies(
  cookies.map((cookie) => ({
    ...cookie,
    domain: hostname,
    path: "/",
    httpOnly: false,
    secure: baseUrl.startsWith("https://"),
    sameSite: "Lax",
    expires: session.expires_at,
  })),
);

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300)); });

// Vercel's SSO gate first: this response sets the _vercel_jwt cookie for the host.
if (BYPASS) {
  await page.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, {
    waitUntil: "domcontentloaded",
  });
}

const target = `${baseUrl}/coach/workouts/${programId}/days/${dayId}`;
await page.goto(target, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const report = await page.evaluate(() => {
  const text = document.body.innerText;
  const inputs = [...document.querySelectorAll("input[aria-label]")].map((i) => i.getAttribute("aria-label"));
  return {
    url: location.href,
    heading: document.querySelector("h1")?.textContent ?? null,
    guidanceButtons: [...document.querySelectorAll("button")].filter((b) => (b.textContent ?? "").includes("דגשים")).length,
    setsInputs: inputs.filter((label) => label?.startsWith("סטים")).length,
    repsInputs: inputs.filter((label) => label?.startsWith("חזרות")).length,
    restInputs: inputs.filter((label) => label?.startsWith("מנוחה")).length,
    muscleTags: [...document.querySelectorAll(".pill--green")].map((p) => p.textContent).slice(0, 6),
    saveButton: [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("שמירת השינויים") || (b.textContent ?? "").includes("אין שינויים לשמירה")),
    readOnlyBanner: text.includes("לקריאה בלבד"),
    copyButton: text.includes("יצירת עותק לעריכה"),
    onLogin: location.pathname.startsWith("/login"),
  };
});

console.log(JSON.stringify(report, null, 2));

if (ATTEMPT_SAVE) {
  const read = () => page.evaluate((card) => {
    const article = document.querySelectorAll("article")[card];
    const field = (label) => article?.querySelector(`input[aria-label^="${label}"]`)?.value ?? null;
    return { exercise: article?.querySelector("h2")?.textContent ?? null, sets: field("סטים"), reps: field("חזרות"), rest: field("מנוחה"), notes: field("טכניקה") };
  }, CARD);

  const before = await read();
  const wrote = {};
  for (const field of ["sets", "reps", "rest", "notes"]) {
    const next = flag(field);
    if (next === undefined) continue;
    wrote[field] = next;
    const label = { sets: "סטים", reps: "חזרות", rest: "מנוחה", notes: "טכניקה" }[field];
    await page.locator("article").nth(CARD).locator(`input[aria-label^="${label}"]`).fill(next);
  }
  await page.getByRole("button", { name: /שמירת השינויים/ }).click();
  await page.waitForTimeout(6000);
  const status = await page.locator('[role="status"]').first().textContent().catch(() => null);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const after = await read();
  const persisted = Object.entries(wrote).every(([field, value]) => after[field] === value);
  console.log(JSON.stringify({ saveAttempt: { card: CARD, before, wrote, statusMessage: status, afterReload: after, persisted, consoleErrors } }, null, 2));
}

await page.screenshot({ path: outfile, fullPage: false });
console.log("screenshot:", outfile);
await browser.close();
