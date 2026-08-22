import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { reportedPortions } from "../lib/nutrition/menu-intake.ts";
import { dayLabel, WEEKDAY_LABELS } from "../lib/nutrition/menu-days.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// ------------------------------------------------------------ the client's day

test("the check-in keeps a draft, and never pretends to keep the photographs", async () => {
  const form = await source("components/client/PersistedCheckInForm.tsx");
  // Six steps and five ratings, lost until now to a closed tab.
  for (const field of ["weight", "navelCircumference", "workoutsCompleted", "mealPlanDays", "adherence", "notes"])
    assert.match(form, new RegExp(`"${field}"`), field);
  assert.match(form, /localStorage\.setItem\(DRAFT_KEY/);
  assert.match(form, /localStorage\.removeItem\(DRAFT_KEY/);
  // A File handle does not survive the document that produced it, so restoring
  // one would show a complete-looking form that submits without its photos.
  assert.doesNotMatch(form, /DRAFT_FIELDS[\s\S]{0,300}photo_front/);
  assert.match(form, /שוחזרו הנתונים שהזנת קודם/);
  // Accepted means there is nothing left to protect.
  assert.match(form, /if \(!state\.ok\) return;\s*\n\s*clearDraft\(\);/);
});

test("the nutrition screen can look backwards, and only backwards", async () => {
  const page = await source("app/nutrition/page.tsx");
  // Every part of this day has always been stored per date; nothing asked.
  assert.match(page, /searchParams: Promise<\{ date\?: string \}>/);
  // The row is the Hebrew week now - Sunday to Saturday - so "backwards only" is
  // no longer a property of the list itself and has to be asserted directly: a
  // requested day has to be in this week AND to have already happened.
  assert.match(page, /days\.includes\(requested\) && requested <= now \? requested : now/);
  assert.match(page, /length: 7/);
  // "Now" is a property of today, not of whichever day is on screen.
  assert.match(page, /const isNow = isToday &&/);
  assert.match(page, /\{isToday&&menu\?\.meals\.some/);
});

test("one check-in a week - the window the instrument actually measures", async () => {
  const [migration, page, action] = await Promise.all([
    source("supabase/migrations/202608210004_one_check_in_per_week.sql"),
    source("app/check-in/page.tsx"),
    source("app/actions/product.ts"),
  ]);
  // A daily ceiling permits seven a week, and every part of the check-in says
  // week: the reminder is deduped per week, the form asks how many of seven days
  // the menu was kept, and it asks how the week went.
  assert.match(migration, /before insert on public\.check_ins/);
  assert.match(migration, /check_in_already_this_week/);
  assert.doesNotMatch(migration, /check_in_already_today/);
  // Sunday to Saturday, matching weekStart() and the training week both sides
  // of the product already mean - not date_trunc('week'), which opens on Monday.
  assert.match(migration, /extract\(dow from/);
  // Comments are allowed to name it - one of them explains why it is not used.
  const statements = migration.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(statements, /date_trunc\('week'/);
  // The daily guard was applied before the rule was settled; it is removed here
  // rather than left as a second answer.
  assert.match(migration, /drop trigger if exists check_ins_one_per_day_trigger/);
  assert.match(migration, /drop function if exists public\.check_ins_one_per_day\(\)/);
  assert.match(migration, /drop function if exists public\.check_in_submitted_today\(\)/);
  // A trigger, not a unique index: the natural index would be over a time-zone
  // expression Postgres will not index, and a trigger needs no backfill.
  assert.match(migration, /security definer/);
  assert.match(page, /check_in_week_state/);
  assert.match(page, /הצ׳ק־אין של השבוע נשלח/);
  assert.match(action, /הצ׳ק־אין של השבוע כבר נשלח/);
});

test("a check-in whose photos failed is removed, or reported as kept", async () => {
  const action = await source("app/actions/product.ts");
  // check_ins has no delete policy for anybody, so the client's own session
  // removed zero rows and reported no error - RLS filtering every row out is not
  // a failure. The client was told it had not saved while the row sat in the
  // coach's queue, and under a weekly guard that phantom row locks them out.
  assert.match(action, /createSupabaseAdminClient\(\)\.from\("check_ins"\)\.delete\(\)/);
  assert.match(action, /if \(!removed \|\| !photoResult\.cleanupOk\)/);
  assert.match(action, /והצ׳ק־אין עצמו כן נשמר/);
  // The old message claimed the opposite of what had happened.
  assert.doesNotMatch(action, /העלאת התמונה נכשלה\. הצ׳ק־אין לא נשמר\."/);
});

test("\"the same as yesterday\" carries the amount as well as the choice", async () => {
  const migration = await source("supabase/migrations/202608210003_repeat_carries_the_amount.sql");
  assert.match(migration, /selection_date, amount_override\)/);
  assert.match(migration, /p_to, source\.amount_override/);
  // A choice already made today is still the client's.
  assert.match(migration, /not exists\(\s*\n\s*select 1 from public\.meal_group_selections existing/);
});

test("a scanned package offers itself before asking for grams", async () => {
  const sheet = await source("components/client/AteSomethingElse.tsx");
  // The lookup has always returned the package weight; the sheet discarded it
  // and asked the client to weigh something they had already eaten.
  assert.match(sheet, /unitWeightGrams\?: number \| null/);
  assert.match(sheet, /אריזה שלמה/);
  assert.match(sheet, /חצי אריזה/);
  assert.match(sheet, /if \(food\.unitWeightGrams && food\.unitWeightGrams > 0\) setGrams/);
});

// ------------------------------------------------------------- the coach's day

test("the coach has an inbox, reachable without going through a client", async () => {
  const [page, nav] = await Promise.all([
    source("app/coach/messages/page.tsx"),
    source("components/coach/CoachNav.tsx"),
  ]);
  assert.match(nav, /href:"\/coach\/messages"/);
  // Whose turn it is is the default, because it is the only view that produces
  // work. Unread is a different question and gets its own filter.
  assert.match(page, /value: "waiting"/);
  assert.match(page, /thread\.awaitingReply/);
  // An inbox for a coach is as much "who have I not spoken to" as "who waits".
  assert.match(page, /לקוחות שעוד לא התחלת איתם שיחה/);
});

test("the thread list has no ceiling", async () => {
  const [migration, repository] = await Promise.all([
    source("supabase/migrations/202608210005_coach_thread_list.sql"),
    source("lib/messages/repository.ts"),
  ]);
  // Past 500 messages the oldest threads simply stopped appearing, and the
  // unread counts were short by whatever fell off the end.
  assert.match(migration, /distinct on \(m\.client_id\)/);
  assert.match(migration, /security invoker/);
  assert.match(repository, /rpc\("coach_message_threads"\)/);
  // The client-side fold survives only as a fallback for an unapplied migration.
  assert.match(repository, /if \(!isMissing\(threadError\.code\)\) throw threadError/);
});

test("the coach sees the gap, not only the corrected total", () => {
  const meals = [{
    title: "ארוחת ערב",
    items: [
      { id: "a", name: "אורז", displayQuantity: 150, measurementUnit: "גרם" },
      { id: "b", name: "פיתה", displayQuantity: 2, measurementUnit: "יחידות" },
    ],
    groups: [
      { selectedItemId: "a", amountOverride: 75 },
      // Eaten as prescribed, so it is not a finding.
      { selectedItemId: "b", amountOverride: 2 },
      // No override at all: the common case, and it says nothing.
      { selectedItemId: "b" },
    ],
  }];
  const changed = reportedPortions(meals);
  assert.equal(changed.length, 1);
  assert.deepEqual(changed[0], { mealTitle: "ארוחת ערב", name: "אורז", planned: 150, reported: 75, unit: "גרם" });
  // A day eaten as written produces nothing.
  assert.deepEqual(reportedPortions([{ title: "בוקר", items: [], groups: [] }]), []);
  // Zero is an answer - "served and left" - and has to survive as one.
  const none = reportedPortions([{
    title: "בוקר",
    items: [{ id: "a", name: "קוטג׳", displayQuantity: 200, measurementUnit: "גרם" }],
    groups: [{ selectedItemId: "a", amountOverride: 0 }],
  }]);
  assert.equal(none[0]?.reported, 0);
});

test("the client file loads what the open tab renders", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  // A round trip to the Admin API, on every one of eight tabs, for one line on
  // one of them.
  assert.match(page, /const authUser=tab==="overview"\?await/);
  // Walks every weigh-in and check-in the client ever filed.
  assert.match(page, /const report=tab==="report"\?buildClientReport/);
  assert.match(page, /tab==="overview"\s*\n?\s*\?supabase\.from\("client_invitation_statuses"\)/);
});

test("the queue can be cleared of what was already answered, and of nothing else", async () => {
  const action = await source("app/actions/product.ts");
  // Replying is the satisfying half and closing is the bookkeeping, so the
  // queue only ever grew.
  assert.match(action, /export async function handleAnsweredCheckIns/);
  assert.match(action, /\.eq\("status", "reviewed"\)/);
  assert.match(action, /\.is\("handled_at", null\)/);
  // A check-in nobody replied to is not something this may dismiss.
  assert.doesNotMatch(action, /handleAnsweredCheckIns[\s\S]{0,900}p_handled: false/);
});

test("the menu preview shows one day, and says which", async () => {
  const [page, days] = await Promise.all([
    source("app/coach/menus/[id]/preview/page.tsx"),
    source("lib/nutrition/menu-days.ts"),
  ]);
  // It flattened every day into one list, so a two-day menu previewed as twelve
  // meals with nothing saying which six the client is served.
  assert.match(page, /const meals = days\.find\(\(day\) => day\.day_index === activeDay\)/);
  // The default is the day the client would be served now, by the same rule
  // getActiveClientMenu applies.
  assert.match(page, /available\.includes\(todayIndex\) \? todayIndex : available\.length \? Math\.min\(\.\.\.available\)/);
  assert.match(page, /מוגש היום/);
  // One list of weekdays, shared with the builder.
  assert.match(days, /export const WEEKDAY_LABELS/);
  assert.equal(WEEKDAY_LABELS.length, 7);
  // Day 0 names both jobs it does. It read "ברירת מחדל" alone, and the chip row
  // that offers days to add skips it because it always exists - so a coach
  // looking for ראשון found שני through שבת and concluded Sunday was missing.
  assert.equal(dayLabel(0), "יום ראשון · ברירת מחדל");
  // Sunday is 0, so index 2 is Tuesday - the same indexing israelWeekday and
  // day_index use, which is the whole reason this list has one home.
  assert.equal(dayLabel(1), "יום שני");
  assert.equal(dayLabel(2), "יום שלישי");
});

// --------------------------------------------------------------- the schedule

test("the end-of-day summary obeys its own switch", async () => {
  const [route, form, crons] = await Promise.all([
    source("app/api/cron/daily-coach/route.ts"),
    source("components/notifications/NotificationPreferencesForm.tsx"),
    source("vercel.json"),
  ]);
  // The switch has existed since 202607210002 and nothing read it, so turning
  // it off changed nothing at all.
  assert.match(route, /end_of_day_reminder/);
  assert.match(route, /if \(!\(wantsSummary\.get\(clientId\) \?\? true\)\)/);
  // Never configured means the column default, which is on.
  assert.match(route, /row\.end_of_day_reminder !== false/);
  // A once-nightly job cannot honour a per-client hour, so the hour is stated
  // rather than offered as a control that does nothing.
  assert.doesNotMatch(form, /name="endOfDayReminderTime" type="time"/);
  assert.match(form, /בסביבות 21:30/);
  assert.match(crons, /"schedule": "30 18 \* \* \*"/);
});

// ------------------------------------------------- taking a check-in back

test("a client may withdraw a check-in the coach has not answered", async () => {
  const [migration, action, page, button] = await Promise.all([
    source("supabase/migrations/202608210006_client_may_withdraw_a_check_in.sql"),
    source("app/actions/product.ts"),
    source("app/check-in/page.tsx"),
    source("components/client/WithdrawCheckIn.tsx"),
  ]);
  // check_ins had no delete or update policy for a client at all, so "file
  // another" was the only correction - and the weekly guard closed it.
  assert.match(migration, /create policy check_ins_self_delete on public\.check_ins/);
  assert.match(migration, /for delete to authenticated/);
  // Their own row, and only while it is still theirs to take back: a coach who
  // replied would lose their reply with it, and one who closed it has acted.
  assert.match(migration, /client_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /coach_response is null/);
  assert.match(migration, /handled_at is null/);

  // One rule, in the database. The action does not re-check it.
  assert.match(action, /export async function withdrawCheckIn/);
  assert.doesNotMatch(action, /withdrawCheckIn[\s\S]{0,1200}coach_response !== null/);
  // RLS filtering the row out is a refusal, not an error, and reads as zero rows.
  assert.match(action, /if \(!deleted\?\.length\)/);
  assert.match(action, /המאמן כבר הגיב או סימן את הצ׳ק־אין כטופל/);
  // The photo rows cascade; the stored objects do not.
  assert.match(action, /from\("check_in_photos"\)[\s\S]{0,120}storage_path/);
  assert.match(action, /storage\.from\(CHECK_IN_PHOTO_BUCKET\)\.remove\(paths\)/);

  // Offered only while the database would allow it - a button the product
  // cannot honour is worse than no button.
  assert.match(page, /thisWeek&&!thisWeek\.coach_response&&!thisWeek\.handled_at/);
  // It throws away photographs and a week of answers, so it asks first.
  assert.match(button, /confirming/);
  assert.match(button, /אי אפשר לשחזר/);
});
