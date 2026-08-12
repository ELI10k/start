import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CLIENT_TABS, isClientTab } from "../lib/coach/client-tabs.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The client card used to be one scroll of nine collapsed panels. These pin the
// seven sections it became, and the property that matters most: every tab is
// still the client you opened.

test("the file has the seven sections, and only those", () => {
  assert.deepEqual(CLIENT_TABS.map((tab) => tab.id), [
    "overview", "intake", "nutrition", "workouts", "progress", "report", "notes",
  ]);
  assert.equal(isClientTab("nutrition"), true);
  assert.equal(isClientTab("../../etc"), false);
  assert.equal(isClientTab(""), false);
});

test("an unknown tab falls back rather than rendering nothing", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /const tab = isClientTab\(query\.tab\) \? query\.tab : "overview"/);
});

test("every tab is a real URL that carries the client id", async () => {
  const tabs = await source("components/coach/client-file/ClientTabs.tsx");
  // The id stays in the path and the section in the query, so a tab can be
  // bookmarked and sent, and the existing /workouts and /progress sub-routes are
  // untouched.
  assert.match(tabs, /href=\{`\/coach\/clients\/\$\{clientId\}\?tab=\$\{tab\.id\}`\}/);
  assert.match(tabs, /aria-current=\{current \? "page" : undefined\}/);
});

test("the client row is one link, so the name and the chevron are one target", async () => {
  const list = await source("app/coach/clients/page.tsx");
  assert.match(list, /<Link href=\{`\/coach\/clients\/\$\{client\.id\}`\}/);
  assert.match(list, /פתיחת תיק/);
  // A button inside the row link would be invalid and unreachable by keyboard.
  const row = list.slice(list.indexOf("result.items.map"), list.indexOf("</Link>)}"));
  assert.doesNotMatch(row, /<button/);
  // Search and sort survive.
  assert.match(list, /name="q"/);
  assert.match(list, /sortHref\(item\.value\)/);
});

test("the file reads the calorie engine rather than restating it", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /calculateEnergy\(\{/);
  assert.match(page, /calculateMacroTargetResult\(/);
  assert.doesNotMatch(page, /Mifflin|6\.25|1\.8 \*|\* 0\.25/);
  // And it names what is missing instead of showing a zero.
  assert.match(page, /energy\.missing\.map\(\(field\) => MISSING_LABELS\[field\]\)/);
});

test("the intake tab reuses the one intake form", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /import ClientIntakeForm from "@\/components\/coach\/ClientIntakeForm"/);
  // One form, not a second copy of the same seven fields.
  assert.equal((page.match(/<ClientIntakeForm/g) ?? []).length, 1);
});

test("the report tab wires the existing weekly summary and builds no second engine", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /<WeeklySummaryPanel summaries=\{weeklySummaries\}\/>/);
  // No model call, no prompt, no second generator on this screen.
  assert.doesNotMatch(page, /anthropic|openai|generateSummary|prompt/i);
  assert.match(page, /הדוח אינו נשלח ללקוח אוטומטית/);
});

test("a single measurement is reported as a number, never as a trend", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /const weightChange = latestWeighIn && previousWeighIn/);
  assert.match(page, /יש מדידה אחת בלבד/);
});

test("the notes tab carries notes and nothing else", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  const notesTab = page.slice(page.indexOf('tab === "notes"'), page.indexOf('tab === "notes"') + 200);
  assert.match(notesTab, /<NotesPanel clientId=\{id\} notes=\{coachNotes\?\?\[\]\} open\/>/);
  const extras = await source("components/coach/ClientDetailExtras.tsx");
  assert.match(extras, /export function NotesPanel/);
  // Private by default, and it says so.
  assert.match(extras, /הערות פרטיות — אינן חשופות ללקוח/);
});

test("one missing display field cannot take the whole file down", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  // createSupabaseAdminClient throws synchronously when the key is absent, so
  // the guard has to wrap the call and not only the promise.
  assert.match(page, /try \{\s*const \{ data \} = await createSupabaseAdminClient\(\)\.auth\.admin\.getUserById\(id\);/);
  assert.match(page, /\} catch \{\s*return null;/);
});
