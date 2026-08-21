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
