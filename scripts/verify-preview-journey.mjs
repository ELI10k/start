// The whole coach editing route on a deployed START, end to end, read mostly and
// written only where the check is the write: copy an official programme, edit the
// copy, reload, and prove the official original did not move.
//
// Two gates to get past, and neither credential is ever written down here:
//   - Vercel's SSO on preview deployments. The project's automation-bypass secret
//     is fetched from the Vercel API at run time using the CLI's own login, held
//     in a local const, and never printed. It is not an argument and not a file.
//   - START's login. A Supabase password grant runs in Node and the resulting
//     session is injected as a cookie, so the password never reaches the browser
//     and therefore never reaches a screenshot or a trace.
//
//   node scripts/verify-preview-journey.mjs <baseUrl> <screenshotDir>
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [baseUrl, shotDir] = process.argv.slice(2);
if (!baseUrl || !shotDir) throw new Error("usage: verify-preview-journey.mjs <baseUrl> <screenshotDir>");

const OFFICIAL_PROGRAM = "workout-program-18nf8g8";
const OFFICIAL_DAY = "workout-day-e1x8zr";

const report = {};
const record = async (name, fn) => {
  try {
    report[name] = await fn();
  } catch (error) {
    report[name] = { FAILED: String(error?.message ?? error) };
  }
};

// ---------------------------------------------------------------- credentials

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

// Resolved, used, never logged.
async function bypassSecret() {
  try {
    const auth = JSON.parse(readFileSync(join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"), "utf8"));
    const project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
    const response = await fetch(`https://api.vercel.com/v9/projects/${project.projectName}?teamId=${project.orgId}`, {
      headers: { authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) return "";
    const body = await response.json();
    const entry = Object.entries(body.protectionBypass ?? {}).find(([, meta]) => meta.scope === "automation-bypass");
    return entry?.[0] ?? "";
  } catch {
    return "";
  }
}

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

const rest = (session) => async (path, init = {}) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: anon, authorization: `Bearer ${session.access_token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`${path.split("?")[0]} -> HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
};

// A client is locked to one device; a bare injected session gets bounced to /login.
async function activateDevice(session, deviceId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_current_device`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ p_device_id: deviceId, p_device_name: "Playwright verify" }),
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
    ...part,
    domain: hostname,
    path: "/",
    httpOnly: false,
    secure: baseUrl.startsWith("https://"),
    sameSite: "Lax",
    expires: session.expires_at,
  }));
}

// ------------------------------------------------------------------- run

const BYPASS = await bypassSecret();
const coach = await signIn(env.E2E_COACH_EMAIL, env.E2E_COACH_PASSWORD);
const coachRest = rest(coach);

// The original, as it stands before anything is clicked. Everything at the end is
// compared against this - a copy that quietly rewrote its source would show here.
const structure = async (session, programId) => {
  const api = rest(session);
  const [program] = await api(`workout_programs?id=eq.${programId}&select=*`);
  if (!program) return null;
  const days = await api(`workout_program_days?program_id=eq.${programId}&select=*&order=sort_order`);
  const slots = await api(
    `workout_program_exercises?day_id=in.(${days.map((day) => day.id).join(",")})&select=*&order=sort_order`,
  );
  const sets = slots.length
    ? await api(`workout_set_prescriptions?program_exercise_id=in.(${slots.map((slot) => slot.id).join(",")})&select=*`)
    : [];
  return { program, days, slots, sets };
};

const before = await structure(coach, OFFICIAL_PROGRAM);
report.official_before = {
  name: before.program.name,
  official: before.program.official,
  days: before.days.length,
  slots: before.slots.length,
  setRows: before.sets.length,
};

const browser = await chromium.launch();

// ---- desktop context, coach ------------------------------------------------
const desktop = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "he-IL" });
await desktop.addCookies(sessionCookies(coach, "verify-coach-device-0001"));
const page = await desktop.newPage();
if (BYPASS) {
  await page.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "domcontentloaded" });
}

// 1. the copy button
let copyId = "";
await record("copy_button", async () => {
  await page.goto(`${baseUrl}/coach/workouts/${OFFICIAL_PROGRAM}/days/${OFFICIAL_DAY}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const button = page.getByRole("button", { name: /יצירת עותק לעריכה/ });
  const visible = await button.isVisible();
  await button.click();
  await page.waitForURL(/\/coach\/workouts\/[^/]+$/, { timeout: 60_000 });
  copyId = new URL(page.url()).pathname.split("/").pop();
  return { buttonVisible: visible, landedOn: page.url(), newProgramId: copyId };
});

// 2. what the copy carried over
await record("copy_contents", async () => {
  const copy = await structure(coach, copyId);
  const bySlot = (source) => source.slots.map((slot) => ({
    exercise: slot.exercise_id,
    sets: slot.sets ?? null,
    reps: slot.reps ?? null,
    rest: slot.rest ?? null,
    notes: slot.notes ?? null,
    order: slot.sort_order,
  }));
  const original = JSON.stringify(bySlot(before));
  const duplicated = JSON.stringify(bySlot(copy));
  return {
    name: copy.program.name,
    official: copy.program.official,
    duplicated_from_id: copy.program.duplicated_from_id,
    days: `${copy.days.length} vs ${before.days.length}`,
    daysMatch: copy.days.length === before.days.length,
    dayNamesMatch: JSON.stringify(copy.days.map((d) => d.name)) === JSON.stringify(before.days.map((d) => d.name)),
    slots: `${copy.slots.length} vs ${before.slots.length}`,
    slotsMatch: copy.slots.length === before.slots.length,
    prescriptionsMatch: original === duplicated,
    setRows: `${copy.sets.length} vs ${before.sets.length}`,
    setRowsMatch: copy.sets.length === before.sets.length,
  };
});

// The exercise catalogue is shared, not copied - name, muscle group, equipment,
// video and guidance all hang off workout_exercises, so a copy that kept the same
// exercise_id keeps all of them by construction. Proven on screen below.
await record("copy_day_editable", async () => {
  const copy = await structure(coach, copyId);
  const dayId = copy.days[0].id;
  await page.goto(`${baseUrl}/coach/workouts/${copyId}/days/${dayId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const shown = await page.evaluate(() => {
    const labels = [...document.querySelectorAll("input[aria-label]")].map((i) => i.getAttribute("aria-label"));
    const first = document.querySelector("article");
    return {
      sets: labels.filter((l) => l?.startsWith("סטים")).length,
      reps: labels.filter((l) => l?.startsWith("חזרות")).length,
      rest: labels.filter((l) => l?.startsWith("מנוחה")).length,
      guidance: [...document.querySelectorAll("button")].filter((b) => b.textContent?.includes("דגשים")).length,
      videoLinks: [...document.querySelectorAll("a")].filter((a) => a.textContent?.includes("וידאו")).length,
      muscleTags: [...document.querySelectorAll(".pill--green")].map((p) => p.textContent).slice(0, 4),
      equipmentTags: [...(first?.querySelectorAll(".pill:not(.pill--green)") ?? [])].map((p) => p.textContent),
      exerciseName: first?.querySelector("h2")?.textContent ?? null,
      saveButton: [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("לשמירה")),
      readOnlyBanner: document.body.innerText.includes("לקריאה בלבד"),
    };
  });
  return { dayId, ...shown };
});

// 3. an edit that has to survive a reload
await record("edit_and_reload", async () => {
  const copy = await structure(coach, copyId);
  const dayId = copy.days[0].id;
  const setsField = page.locator('input[aria-label^="סטים"]').first();
  const repsField = page.locator('input[aria-label^="חזרות"]').first();
  const restField = page.locator('input[aria-label^="מנוחה"]').first();
  const wrote = { sets: "5", reps: "7-9", rest: "90 שניות" };
  await setsField.fill(wrote.sets);
  await repsField.fill(wrote.reps);
  await restField.fill(wrote.rest);
  await page.getByRole("button", { name: /שמירת השינויים/ }).click();
  await page.waitForTimeout(4000);
  const status = await page.locator('[role="status"]').first().textContent().catch(() => null);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({
    sets: document.querySelector('input[aria-label^="סטים"]')?.value ?? null,
    reps: document.querySelector('input[aria-label^="חזרות"]')?.value ?? null,
    rest: document.querySelector('input[aria-label^="מנוחה"]')?.value ?? null,
  }));

  // The set rows are supposed to follow the set count.
  const reread = await structure(coach, copyId);
  const slot = reread.slots.find((item) => item.day_id === dayId && item.sort_order === 0);
  const rows = reread.sets.filter((row) => row.program_exercise_id === slot.id);
  return {
    wrote,
    statusMessage: status,
    afterReload: after,
    persisted: after.sets === wrote.sets && after.reps === wrote.reps && after.rest === wrote.rest,
    setPrescriptionRows: rows.length,
    setRowsFollowCount: rows.length === Number(wrote.sets),
  };
});

// 4. the official original, untouched
await record("official_untouched", async () => {
  const after = await structure(coach, OFFICIAL_PROGRAM);
  const shape = (source) => JSON.stringify({
    program: { name: source.program.name, official: source.program.official, status: source.program.status },
    days: source.days.map((day) => [day.id, day.name, day.sort_order]),
    slots: source.slots.map((slot) => [slot.id, slot.exercise_id, slot.sets, slot.reps, slot.rest, slot.sort_order]),
    sets: source.sets.map((row) => [row.id, row.repetitions, row.sort_order]).sort(),
  });
  return { identical: shape(before) === shape(after), days: after.days.length, slots: after.slots.length };
});

await page.screenshot({ path: join(shotDir, "copy-editable-desktop.png") });

// ---- mobile context, coach: the guidance sheet, RTL and overflow -----------
const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await mobile.addCookies(sessionCookies(coach, "verify-coach-device-0001"));
const small = await mobile.newPage();
if (BYPASS) {
  await small.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "domcontentloaded" });
}

await record("coach_mobile_sheet", async () => {
  await small.goto(`${baseUrl}/coach/workouts/${OFFICIAL_PROGRAM}/days/${OFFICIAL_DAY}`, { waitUntil: "networkidle" });
  await small.waitForTimeout(2500);

  const layout = await small.evaluate(() => ({
    dir: document.documentElement.getAttribute("dir"),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offscreenButtons: [...document.querySelectorAll("button, a")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.right > window.innerWidth + 1 || box.left < -1);
    }).length,
    shortTargets: [...document.querySelectorAll("button, a")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.height < 40;
    }).map((el) => (el.textContent ?? "").trim().slice(0, 24)),
  }));

  // Which exercise the first sheet belongs to, so its contents can be checked
  // against the catalogue rather than taken on trust.
  const exerciseName = await small.locator("article h2").first().textContent();
  await small.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
  await small.waitForTimeout(900);

  const sheet = await small.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { open: false };
    const box = dialog.getBoundingClientRect();
    return {
      open: true,
      ariaModal: dialog.getAttribute("aria-modal"),
      title: dialog.querySelector(".sheet__title")?.textContent ?? null,
      sections: [...dialog.querySelectorAll("h3")].map((h) => h.textContent),
      hasImage: Boolean(dialog.querySelector("img")),
      imagePlaceholder: dialog.innerText.includes("לא הועלתה תמונה"),
      missingNote: [...dialog.querySelectorAll("p")].map((p) => p.textContent ?? "").find((t) => t.includes("לא סופק מידע")) ?? null,
      videoLink: dialog.innerText.includes("צפייה בסרטון ההסבר"),
      closeButton: [...dialog.querySelectorAll("button")].some((b) => b.textContent?.trim() === "סגירה"),
      withinViewport: box.left >= -1 && box.right <= window.innerWidth + 1,
      bodyScrollLocked: document.body.style.overflow === "hidden",
      sheetOverflow: dialog.scrollWidth - dialog.clientWidth,
      sectionText: Object.fromEntries([...dialog.querySelectorAll("h3")].map((h) => [
        h.textContent,
        [...(h.nextElementSibling?.querySelectorAll("li") ?? [])].map((li) => li.textContent?.trim()),
      ])),
      howToText: [...dialog.querySelectorAll("h3")].find((h) => h.textContent === "איך מבצעים")?.nextElementSibling?.textContent ?? null,
    };
  });

  await small.screenshot({ path: join(shotDir, "sheet-coach-mobile.png") });

  // Nothing invented: every rendered section has to match the catalogue row.
  const [row] = await coachRest(`workout_exercises?name=eq.${encodeURIComponent(exerciseName.trim())}&select=*`);
  const expected = row
    ? {
        howTo: (row.how_to ?? row.execution_notes ?? null),
        cues: row.cues ?? [],
        mistakes: row.common_mistakes ?? [],
        muscles: [row.primary_muscle_group, ...(row.secondary_muscle_groups ?? [])].filter(Boolean),
        equipment: row.equipment ?? null,
        image: row.image_url ?? null,
      }
    : null;
  const truthful = expected && {
    howToMatchesCatalogue: (sheet.howToText ?? "").trim() === (expected.howTo ?? "").trim(),
    musclesMatchCatalogue: JSON.stringify(sheet.sectionText["שרירים עובדים"] ?? []) === JSON.stringify([...new Set(expected.muscles)]),
    cuesSectionShown: Boolean(sheet.sectionText["דגשים חשובים"]),
    cuesInCatalogue: expected.cues.length,
    mistakesSectionShown: Boolean(sheet.sectionText["טעויות נפוצות"]),
    mistakesInCatalogue: expected.mistakes.length,
    imageInCatalogue: expected.image,
    imageRendered: sheet.hasImage,
  };

  // Close paths: the button, then Escape, then the backdrop.
  await small.getByRole("button", { name: "סגירה" }).click();
  await small.waitForTimeout(500);
  const closedByButton = (await small.locator('[role="dialog"]').count()) === 0;

  await small.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
  await small.waitForTimeout(600);
  await small.keyboard.press("Escape");
  await small.waitForTimeout(500);
  const closedByEscape = (await small.locator('[role="dialog"]').count()) === 0;

  await small.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
  await small.waitForTimeout(600);
  await small.locator(".sheet-backdrop").click({ force: true });
  await small.waitForTimeout(500);
  const closedByBackdrop = (await small.locator('[role="dialog"]').count()) === 0;
  const scrollRestored = await small.evaluate(() => document.body.style.overflow !== "hidden");

  return { exerciseName: exerciseName.trim(), layout, sheet, truthful, closedByButton, closedByEscape, closedByBackdrop, scrollRestored };
});

// 5/6. is the test client on the official programme?
await record("assignment", async () => {
  const profiles = await coachRest(`profiles?select=id,full_name,role&role=eq.client`);
  const assignments = await coachRest(`workout_assignments?select=id,client_id,program_id,status,start_date,weekly_frequency`);
  const client = await signIn(env.E2E_CLIENT_EMAIL, env.E2E_CLIENT_PASSWORD);
  const clientId = client.user.id;
  const mine = assignments.filter((row) => row.client_id === clientId);
  const programs = await coachRest(`workout_programs?select=id,name`);
  const nameOf = (id) => programs.find((p) => p.id === id)?.name ?? id;
  return {
    testClientId: clientId,
    testClientName: profiles.find((p) => p.id === clientId)?.full_name ?? null,
    assignedProgrammes: mine.map((row) => ({ program: nameOf(row.program_id), id: row.program_id, status: row.status, weekly: row.weekly_frequency })),
    assignedToOfficialFbw: mine.some((row) => row.program_id === OFFICIAL_PROGRAM),
    totalClients: profiles.length,
  };
});

// the client's own screen, and the sheet on it
await record("client_mobile_sheet", async () => {
  const client = await signIn(env.E2E_CLIENT_EMAIL, env.E2E_CLIENT_PASSWORD);
  const deviceId = "verify-client-device-0001";
  await activateDevice(client, deviceId);
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "he-IL", isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await context.addCookies(sessionCookies(client, deviceId));
  const clientPage = await context.newPage();
  if (BYPASS) {
    await clientPage.goto(`${baseUrl}/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`, { waitUntil: "domcontentloaded" });
  }
  await clientPage.goto(`${baseUrl}/workouts`, { waitUntil: "networkidle" });
  await clientPage.waitForTimeout(3000);

  const landing = {
    url: clientPage.url(),
    heading: await clientPage.locator("h1").first().textContent().catch(() => null),
    guidanceButtons: await clientPage.getByRole("button", { name: /דגשים לתרגיל/ }).count(),
    horizontalOverflow: await clientPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    dir: await clientPage.evaluate(() => document.documentElement.getAttribute("dir")),
  };

  let sheet = { open: false };
  if (landing.guidanceButtons > 0) {
    await clientPage.getByRole("button", { name: /דגשים לתרגיל/ }).first().click();
    await clientPage.waitForTimeout(900);
    sheet = await clientPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { open: false };
      const box = dialog.getBoundingClientRect();
      return {
        open: true,
        title: dialog.querySelector(".sheet__title")?.textContent ?? null,
        sections: [...dialog.querySelectorAll("h3")].map((h) => h.textContent),
        hasImage: Boolean(dialog.querySelector("img")),
        imagePlaceholder: dialog.innerText.includes("לא הועלתה תמונה"),
        missingNote: [...dialog.querySelectorAll("p")].map((p) => p.textContent ?? "").find((t) => t.includes("לא סופק מידע")) ?? null,
        videoLink: dialog.innerText.includes("צפייה בסרטון ההסבר"),
        withinViewport: box.left >= -1 && box.right <= window.innerWidth + 1,
      };
    });
    await clientPage.screenshot({ path: join(shotDir, "sheet-client-mobile.png") });
    await clientPage.getByRole("button", { name: "סגירה" }).click();
    await clientPage.waitForTimeout(400);
    sheet.closes = (await clientPage.locator('[role="dialog"]').count()) === 0;
  } else {
    await clientPage.screenshot({ path: join(shotDir, "client-workouts.png") });
  }
  await context.close();
  return { landing, sheet };
});

console.log(JSON.stringify(report, null, 2));
console.log("\ncreated copy:", copyId);
await browser.close();
