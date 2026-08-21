import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The shape that breaks is "one round trip per client, inside a function with a
// wall clock". It does not fail loudly - the function is cut off partway and the
// clients at the end of the list get nothing, with no error to explain it. These
// tests pin the shape rather than a number, because the number depends on
// latency and the shape is what decides whether there is a number at all.

test("the photo shrinker is shared, and every upload path uses it", async () => {
  const [shrink, checkIn, foodLog] = await Promise.all([
    source("lib/images/shrink.ts"),
    source("components/client/CheckInPhotoInputs.tsx"),
    source("components/client/AteSomethingElse.tsx"),
  ]);
  assert.match(shrink, /export const MAX_EDGE = 1600/);
  // A portrait photo must not be re-encoded on its side.
  assert.match(shrink, /imageOrientation: "from-image"/);
  // Re-encoding that does not help is not an improvement.
  assert.match(shrink, /blob\.size >= file\.size\) return file/);
  // It must never block a submission.
  assert.match(shrink, /catch \{\s*\n\s*return file;/);

  // The check-in already shrank its three photos; the food log - which accepts
  // one per meal with no cadence limit - uploaded whatever the camera produced.
  for (const [name, text] of [["check-in", checkIn], ["food log", foodLog]] as const) {
    assert.match(text, /shrinkImage/, `${name} does not shrink`);
    assert.match(text, /replaceInputFile/, `${name} does not replace the input's file`);
  }
  // The copy that used to live in the check-in component is gone from it.
  assert.doesNotMatch(checkIn, /async function shrink\(/);
});

test("the daily coach writes once for the roster, not once per client", async () => {
  const [route, migration] = await Promise.all([
    source("app/api/cron/daily-coach/route.ts"),
    source("supabase/migrations/202608210007_notifications_at_scale.sql"),
  ]);
  assert.match(route, /rpc\("create_in_app_notifications", \{ p_rows: batch \}\)/);
  // No single-row write left inside the loop.
  assert.doesNotMatch(route, /await supabase\.rpc\("create_in_app_notification",/);
  // The message is still built per client, in the language the product speaks.
  assert.match(route, /buildDailyCoachMessage\(dailyInput\(clientId\)\)/);
  // Per-row behaviour is unchanged because the same function still does it.
  assert.match(migration, /perform public\.create_in_app_notification\(/);
  // One unusable row must not cost every other client their message.
  assert.match(migration, /exception when others then/);
});

test("the weekly summary reads the roster in a fixed number of queries", async () => {
  const route = await source("app/api/cron/weekly-summary/route.ts");
  // Ten round trips per client became ten for everyone.
  assert.match(route, /async function gatherAllFacts/);
  assert.doesNotMatch(route, /async function gatherFacts\(/);
  // Every read is scoped to the whole list.
  assert.doesNotMatch(route, /\.eq\("client_id", clientId\)/);
  // The coach lookup was its own round trip per client.
  assert.match(route, /async function coachesFor/);
  // Writes are batched too.
  assert.match(route, /rpc\("upsert_weekly_summaries", \{ p_rows: summaries \}\)/);
  assert.match(route, /rpc\("create_in_app_notifications", \{ p_rows: coachNotices \}\)/);
  assert.doesNotMatch(route, /rpc\("upsert_weekly_summary",/);
  // The arithmetic lives in one place, on rows already fetched.
  assert.match(route, /function buildFacts\(/);
});

test("notifications stop accumulating forever", async () => {
  const [migration, route] = await Promise.all([
    source("supabase/migrations/202608210007_notifications_at_scale.sql"),
    source("app/api/cron/reminders/route.ts"),
  ]);
  // Nothing had ever deleted one, and the scheduler writes up to four a day per
  // client - at a thousand clients that is most of a free-tier database spent on
  // reminders about days long past.
  assert.match(migration, /create or replace function public\.prune_notifications/);
  // Unread outlives read: deleting something the client has not seen silently
  // answers a question nobody asked.
  assert.match(migration, /p_read_days integer default 60, p_unread_days integer default 180/);
  assert.match(migration, /read_at is null and created_at < now\(\) - make_interval\(days => greatest\(p_unread_days/);
  // The delete walks by age.
  assert.match(migration, /notifications_created_at_idx/);
  // Runs alongside the job that already runs daily, and never at its expense.
  assert.match(route, /rpc\("prune_notifications"\)/);
  assert.match(route, /if \(pruneError\) console\.error/);
});

test("neither batch writer is reachable by a signed-in person", async () => {
  const migration = await source("supabase/migrations/202608210007_notifications_at_scale.sql");
  for (const fn of ["create_in_app_notifications(jsonb)", "upsert_weekly_summaries(jsonb)", "prune_notifications(integer, integer)"])
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn.replace(/[()]/g, "\\$&")} from public, anon`), fn);
  // And no grant puts them back.
  assert.doesNotMatch(migration, /grant execute on function public\.(create_in_app_notifications|upsert_weekly_summaries|prune_notifications)/);
});

// The batch functions are called with a JSON array built in TypeScript and read
// field by field in SQL. Nothing type-checks across that boundary: rename a key
// on one side and the other silently reads NULL, which for a notification means
// a row that is quietly never written. These two tests compare the key sets.
//
// They exist because the cron cannot be run from a development machine - it
// needs the service-role key, which lives only in the deployment environment -
// so a mismatch would not surface until the job next fired in production.

const keysSentIn = (source: string, marker: string) => {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `could not find ${marker}`);
  const slice = source.slice(start, source.indexOf("});", start));
  // A key follows the opening brace or a comma. Anchoring to the start of a line
  // reads only the first key on each - which is how this test first failed,
  // against an object literal that puts several on one line.
  return new Set([...slice.matchAll(/[{,]\s*([a-z_]+):/g)].map((match) => match[1]));
};

const keysReadBy = (sql: string, fn: string) => {
  const start = sql.indexOf(`create or replace function public.${fn}`);
  assert.notEqual(start, -1, `could not find ${fn}`);
  const body = sql.slice(start, sql.indexOf("end $$;", start));
  return new Set([...body.matchAll(/v_row->>?'([a-z_]+)'/g)].map((match) => match[1]));
};

test("the daily coach sends exactly the keys the batch writer reads", async () => {
  const [route, sql] = await Promise.all([
    source("app/api/cron/daily-coach/route.ts"),
    source("supabase/migrations/202608210007_notifications_at_scale.sql"),
  ]);
  const sent = keysSentIn(route, "batch.push({");
  const read = keysReadBy(sql, "create_in_app_notifications");
  assert.deepEqual([...sent].sort(), [...read].sort());
  assert.ok(sent.has("dedupe_key"), "without a dedupe key a re-run duplicates every row");
});

test("the weekly summary sends exactly the keys its batch writer reads", async () => {
  const [route, sql] = await Promise.all([
    source("app/api/cron/weekly-summary/route.ts"),
    source("supabase/migrations/202608210007_notifications_at_scale.sql"),
  ]);
  const summaryKeys = keysSentIn(route, "summaries.push({");
  assert.deepEqual([...summaryKeys].sort(), [...keysReadBy(sql, "upsert_weekly_summaries")].sort());
  // The coach notice goes through the notification writer, so it answers to that
  // function's keys and not to this one's.
  const noticeKeys = keysSentIn(route, "coachNotices.push({");
  assert.deepEqual([...noticeKeys].sort(), [...keysReadBy(sql, "create_in_app_notifications")].sort());
});

// ------------------------------------------------- the panel that never filled

test("the risk scores the coach dashboard reads are actually written", async () => {
  const [route, repository, panel, dashboard] = await Promise.all([
    source("app/api/cron/weekly-summary/route.ts"),
    source("lib/coach-intelligence/proactive-repository.ts"),
    source("components/coach/CoachAttentionPanel.tsx"),
    source("app/coach/page.tsx"),
  ]);
  // habit_analysis_reports was read since the day it was created and written by
  // nothing - no code, no job, not even an insert policy - so the panel the
  // 2026-08-20 review moved to the top of the coach's morning screen had never
  // once had a row to show.
  assert.match(route, /from\("habit_analysis_reports"\)\s*\n?\s*\.upsert\(reports/);
  assert.match(route, /onConflict: "client_id,week_start,week_end"/);
  // The engine already existed; only the writer was missing.
  assert.match(route, /calculateCoachScores\(metrics\)/);
  assert.match(route, /weeklyRecommendations\(metrics\)/);
  // A panel must not cost every client their summary.
  assert.match(route, /console\.error\("habit reports threw"/);

  // The risk score leans on logins - with no figure every client scores as
  // absent, which is how a "requires attention" panel names everybody.
  assert.match(route, /from\("device_sessions"\)/);
  assert.match(route, /logins: facts\.loginDays/);
  // A week with nothing in it is insufficient data, not risk.
  assert.match(route, /status: measured \? "ready" : "insufficient_data"/);

  // "Nothing has been measured" and "no client is at risk" are different facts,
  // and the panel used to tell the coach the second when the truth was the first.
  assert.match(repository, /measured: signals\.length > 0/);
  assert.match(panel, /measured \? "אין כרגע לקוח עם אות סיכון מבוסס נתונים\." :/);
  assert.match(dashboard, /measured=\{attention\.measured\}/);
});
