# START - Project Status

Last updated: 2026-08-21 — third product review implemented, then all twelve of
its actionable proposals built; see "2026-08-21" below.
Previously: 2026-08-20 — second product review implemented.
Previously: 2026-08-19 — first product review implemented. The 2026-08-09 feature
freeze is lifted; see the review section below for what changed and what still
needs a person.

## Repository
- Root: `/Users/lykhn/start`
- Remote: `https://github.com/ELI10k/start.git`
- Second worktree: `/Users/lykhn/start-premium-client-experience` on `codex/start-premium-client-experience`

## Branches
| Branch | Purpose | State |
|---|---|---|
| `main` | canonical | `a3f7cf3` — synced with integration, pushed |
| `integration/start-unified` | working branch | `a3f7cf3` — same commit as main |
| `backup/start-full-state-2026-07-30` | snapshot of the rescued uncommitted work | keep until beta ends |
| `codex/start-premium-client-experience` | the dark/gold redesign source | keep until beta ends |

Production ran `main` @ `85d94c1` — **a commit from 2026-08-10** — until 2026-08-20.

### The deploy pipeline was broken for ten days
Vercel's link to `ELI10k/start` had failed with `Project Link not found`, so no
push produced a deployment and the site kept serving the 2026-08-10 build. Every
commit from 2026-08-11 onwards — both product reviews included — was in GitHub
and had never reached a client. Fixed 2026-08-20 by removing and re-adding the
connection in Vercel → Project Settings → Git.

**If work stops appearing on the site, check that panel first.** The symptom is
silence, not an error: pushes succeed, GitHub holds the commits, and the
Deployments list simply never grows.

## Baseline validation — 2026-08-19
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | pass |
| ESLint | `npm run lint` | pass |
| Tests | `npm test` | **412 / 412** |
| E2E | `npm run e2e` | see "E2E state" below |
| Credential scan | `npm run e2e:scan` | clean |
| Build | `npm run build` | pass |
| Migration validation | `npm run supabase:migrations:validate` | pass, 65 migrations |

`tsconfig` target moved ES2017 → ES2022; `tsc` had one error before that.
`scripts/validate-migrations.mjs` had been failing since 2026-08-18 — it required
`begin;` to be the first characters of the file, so every migration with a header
comment was rejected. It now skips leading comments.

## 2026-08-21 proposals — twelve of fourteen built, plus one defect they exposed

The review's own "found and not implemented" list, worked through. Twelve are
done; two need something this session cannot obtain and are listed under Open
items. 15 regression tests added (`tests/proposals-2026-08-21.test.ts`).

### One of them was not an improvement at all
**"סיכום סוף יום" has been a dead switch since `202607210002`.** The toggle and
the time are stored on `notification_preferences` and *nothing has ever read
either* — not the daily-coach route, not any reminder function. A client who
turned the evening summary off kept receiving it every night, which is the one
thing a notification setting must never do. The category gate inside
`create_in_app_notification` does not cover it: that asks whether nutrition
notifications are wanted at all, which is a broader question.

The cron now reads the switch and skips the clients who set it off (the response
reports `declined`). The *hour* it cannot honour — one nightly job cannot fire at
thirty different times — so the time picker is gone and the screen states the
actual hour instead, the same treatment the evening workout reminder already got.
`vercel.json` moved the run to 18:30 UTC so the stated 21:30 is true in summer.

### Migrations added — applied 2026-08-21 by Eli via the Supabase SQL editor
| Migration | What it does |
|---|---|
| `202608210003_repeat_carries_the_amount` | "כמו אתמול" copies the reported amount along with the choice |
| `202608210004_one_check_in_per_week` | a trigger refusing a second check-in in the same Sunday-to-Saturday week, plus `check_in_week_state()` so the screen can say so on arrival |
| `202608210005_coach_thread_list` | `coach_message_threads()` — one row per thread, computed in the database |

All additive, all with rollbacks in `supabase/seeds/`. `202608210004` is a trigger
rather than a unique index on purpose: the natural index would be over a
time-zone expression, which is STABLE and therefore not indexable. A trigger also
needs no backfill, so a client who already holds two rows in one week keeps both.

**`202608210004` shipped daily first and was corrected the same day.** Eli applied
the daily version, then pointed out that a check-in is a full weekly analysis and
a daily ceiling permits seven a week — a guard that does not guard the thing that
matters. He was right, and the product already said so in the one place that sets
the cadence: the reminder is deduped on `'check-in-reminder-' || week`, the form
asks how many of seven days the menu was kept, and it asks how the *week* went.
The replacement drops `check_ins_one_per_day_trigger`, `check_ins_one_per_day()`
and `check_in_submitted_today()`, so a database that took the daily version
converts cleanly by running the new file.

Verified on application: `check_ins_one_per_week_trigger` is the only check-in
trigger present — two rows there would mean the daily one had survived.

**All five of today's migrations are now live in production.** The application
degrades cleanly without them, which is what let the daily-to-weekly correction
be a single re-run rather than a coordinated deploy.

### Built
**Client**
1. **The check-in keeps a draft.** Six steps, five ratings and a weight, and until
   now a closed tab took all of it — while the menu editor has mirrored a draft to
   the device every second since the day a coach lost one. The photographs are
   deliberately not in it: a `File` handle does not survive the document that
   produced it, and restoring one would show a complete-looking form that submits
   without them. The banner says so when photos are due this week.
2. **The nutrition screen has a past.** Everything on it — selections, marks,
   amounts, the food log — has always been stored per date and nothing ever asked
   for a date but today, so a client could not close last night's fifth meal or
   look at yesterday at all. Seven days back, never forward; every day is a URL.
   "Now" markers are a property of today and no longer follow the view.
3. **"כמו אתמול" carries the amount.** It filled the choice and dropped the
   portion — for the client the override was built for, that is the keystroke it
   exists to remove, retyped every morning.
4. **One check-in a week**, said on arrival rather than after six steps, naming
   the date the next one opens. A double tap was enough to file two, and
   duplicates shift the photo cycle out of step because it counts check-ins.
   Sunday to Saturday, the same week `weekStart()` and the coach's file use.
12. **A check-in whose photographs failed is actually removed** — or reported as
   kept, truthfully. `check_ins` carries an insert policy, a select policy and a
   coach update policy, and **no delete policy for anybody**, so the rollback in
   `saveCheckIn` deleted zero rows through the client's own session and reported
   no error: RLS filtering every row out is not a failure. The client was told
   "the check-in was not saved" while the row sat in the coach's queue without its
   photographs — and under the weekly guard that phantom row would lock them out
   until Sunday. The cleanup now goes through the service role, and where that is
   unavailable the message says the check-in was kept rather than the opposite.
5. **A scanned package offers itself.** The barcode lookup has always returned the
   package weight and the sheet discarded it, so a client was asked to weigh a
   yoghurt they had just scanned. "אריזה שלמה", "חצי אריזה", and the package is
   the opening value.

**Coach**
6. **An inbox at `/coach/messages`**, with a nav entry. Writing to a client should
   not require navigating to them: the only routes in were the dashboard panel and
   a tab inside one client's file. Default view is whose turn it is; unread is a
   separate filter; clients with no thread are listed under their own heading,
   because "who have I not spoken to" is half of what an inbox is for.
7. **The thread list lost its ceiling.** It read the 500 most recent messages and
   folded them in TypeScript. Past that, the oldest threads stop appearing and the
   unread counts are short by whatever fell off — the exact failure an inbox exists
   to prevent. `DISTINCT ON` in the database, one row per thread.
8. **The gap, not only the total.** Yesterday's fix made the totals read what was
   eaten; a correct total still does not say *why*. The nutrition tab now lists the
   rows the client changed — "אורז · תוכנן 150 גרם · נאכל 75" — and prints nothing
   on a day eaten as written, which is most days.
9. **The client file loads what the open tab renders.** Three things still ran on
   all eight: the invitation history, `auth.admin.getUserById` (a round trip to the
   Admin API for one line on one tab), and `buildClientReport`, which walks every
   weigh-in and check-in the client has ever filed.
10. **The menu preview shows one day and says which.** It flattened every day into
    one list, so a two-day menu previewed as twelve meals with nothing saying which
    six the client is served. Defaults to the day they would be served now, by the
    same rule `getActiveClientMenu` uses. `WEEKDAY_LABELS` now has one home.
11. **"סגירת N שנענו".** The queue holds anything not marked handled, which is
    right — but replying is the satisfying half and closing is the bookkeeping, so
    it only ever grew. Closes answered check-ins only; one nobody replied to
    cannot be dismissed by it.

### The E2E run, and the three defects it found
The suite had not been run since 2026-08-19. Running it against this work
produced **219 passed, 9 failed** — and none of the nine were caused by it.

1. **Two specs had been broken since 2026-08-20** and nobody knew, because that
   day's review shipped without an E2E run. The collapse of the six meals into
   closed `<details>` rows hid every `fieldset button` on the nutrition screen,
   so `menu-units-and-client` and the "same as yesterday" spec passed or failed
   on what time of day they ran at. Both now open the meal cards first
   (`openMealCards` in `e2e/support/guards.ts`).
2. **A third spec had never run at all.** `menu-units-and-client.spec.ts` is
   `mode: "serial"`, so the failure above skipped everything after it. Fixing the
   first revealed that "a menu duplicated onto a client opens with that client,
   goal and macros" asserts derived macros for an account whose card cannot
   produce a calorie target — it is missing age, height, sex and goal, and the
   screen says so. It now asserts the explanation on that branch and the macros
   on the other.
3. `workouts.spec.ts` used a bare `locator("main")` on `/coach/clients`, which is
   a strict-mode violation while the route's loading boundary renders its own
   `<main role="status">`. It waits for the list's heading instead.

### Two real defects the sweep found
- **Every exercise thumbnail 404ed before loading.** `youtubeThumbnailUrl` asked
  for `maxresdefault`, which YouTube generates only for videos uploaded at HD —
  so for most of this catalogue the first request failed, the card drew its
  placeholder, and only then did the component swap to `hqdefault` and load it.
  Two requests and a visible flicker per card, on a screen that is a list of
  them. It asks for `hqdefault` first now; the fallback below it is `mqdefault`.
  This is the "13 dead `i.ytimg.com` 404s" this document has listed as known
  since 2026-08-19 — they were not dead links, they were the wrong size.
- **The menu builder's reorder arrows were 24px wide** against the 44px a thumb
  needs, and they are the only way to reorder a meal — the drag grip exists on
  food rows, not on meal headers. Now 44×44, side by side rather than stacked,
  because two 44px buttons in a column would make the pair 88px tall in a 48px
  row. Widening them squeezed the meal-type `select` to 26px on a 390px screen,
  so the header row wraps now.

### The hole the weekly guard opened, closed — `202608210006` applied 2026-08-21
`check_ins` carries an insert policy, a select policy and a coach update policy,
and **no delete or update policy for a client**. So the only way a client could
correct a mistyped weight was to file a second check-in — and `202608210004`
closed that. `202608210006` adds a delete policy scoped to their own row, and
only while `coach_response` and `handled_at` are both null: once the coach has
written back the check-in is half a conversation, and once they have closed it
they have acted on it.

Verified on application: `select polname from pg_policy where polname =
'check_ins_self_delete'` returns one row.

Withdrawing is a delete rather than a status, because the photo cycle counts
rows — a withdrawn row left behind would go on shifting "photos required" by one
exactly as a duplicate did. The photo rows cascade; the stored objects are
removed by the action.

### Merged and deployed — 2026-08-21
`main` at `ee61888`. The deploy was **verified rather than assumed**: the live
bundle's fingerprint was captured before the push and polled until it changed,
which it did after about 60 seconds (`1b84d0bd…` → `aabf2527…`). Given this
project's Vercel link once failed silently for ten days, a successful push is
not evidence of a deployment.

### Verification
`tsc` clean · `lint` clean · **485 / 485** unit tests · `build` passes ·
migration validation passes (73 migrations) · **E2E 230 passed, 0 failed**.

## 2026-08-21 third product review

A pass over every coach and client feature. **Nine defects fixed**, all in the
same family: a fact the client stated that did not reach the person it was
stated to. 17 regression tests added (`tests/product-review-2026-08-21.test.ts`).

### The one that mattered
**Yesterday's portion override never left the client's screen.** 202608200006 and
202608200008 let a client say "I ate half of that" and "I ate none of that", and
`getActiveClientMenu` scales the group's chosen row by it — so the client's
nutrition screen was correct. Nothing else was. `eaten_meal_items`, which is the
row that records intake, was written straight from `meal_items`, so the coach's
client file, the evening daily-coach message and every report built on it all
reported **the portion the coach planned**. An override of `0` recorded a full
planned meal. Setting the amount *after* marking the meal eaten changed nothing
at all, and changing the chosen alternative after marking it eaten left the
previous food standing as eaten — with an `amount_override` that had been typed
against a different food's unit still attached to it.

`202608210001_intake_follows_the_client` puts one rule in one place:
`refresh_meal_intake(meal, date)` rewrites a meal's recorded intake from its
current selections, scaled by `meal_item_intake_factor`, and is called from all
three functions that can change what "I ate this much of that" means. A zero
override records no row — which is both the truth and the only value
`eaten_meal_items.amount` accepts, being constrained positive.

### Migrations added — applied 2026-08-21 by Eli via the Supabase SQL editor
| Migration | What it does | Why it matters |
|---|---|---|
| `202608210001_intake_follows_the_client` | intake is recorded at the portion the client reported, and rewritten whenever the selection, the amount or the mark changes | without it the coach reads the plan and calls it the client's week |
| `202608210002_reading_a_thread_clears_its_bell` | `mark_message_thread_read` also marks the notification it raised | the bell kept a badge for a message already read, permanently |

Both additive, both with rollbacks in `supabase/seeds/`. Verified on application:
the three new/changed functions are present, and `set_meal_day_status` has
**exactly one** signature — the four-argument one. Two would mean an ambiguous
overload, which is the trap `202608200001` was written to close.

```sql
select p.proname, pg_get_function_identity_arguments(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('refresh_meal_intake','meal_item_intake_factor',
                    'mark_message_thread_read','set_meal_day_status');
```

Four rows, one per name.

**The database half of this review is therefore live in production; the code half
is not.** The deployed build still calls `set_meal_day_status('other')` on every
food-log entry, so defect 1 below — logging a food erasing an answer the client
already gave — remains live until this work is pushed and deployed.

### Other defects fixed
1. **Logging a food against an already-answered meal erased the answer.**
   `logClientFood` called `set_meal_day_status(..., 'other')` unconditionally,
   and that call *deletes* the meal's recorded intake — so a client who marked
   breakfast eaten and then scanned a snack against it lost the mark and the
   day's calories fell by a whole meal, silently, as a side effect of logging
   something extra. Now only an unanswered meal is marked.
2. **A free-calorie window was recorded as a substitution.** The same call marked
   "נאכל משהו אחר" on a meal that prescribes nothing, so filling the frame as
   designed reached the coach as a missed meal. Free-calorie meals are no longer
   marked, and the sheet asks "מה אכלת במסגרת הזו?" rather than "מה אכלת במקום?".
3. **The dashboard and the client file counted a different day from the nutrition
   screen.** Both read `meal.items` — every row the coach wrote, alternatives
   included, at the coach's portion — so both ignored the portion override and
   every scanned item. All three now share one rule in `lib/nutrition/menu-intake.ts`.
4. **The dashboard called an answered meal unmarked.** "נשארו 3 ארוחות לסמן"
   counted meals the client had already marked "לא נאכל" or "אכלתי משהו אחר".
5. **Coach and client counted different training weeks.** The client's dashboard
   counts from Sunday; the coach's file counted a rolling seven days, so on a
   Wednesday the coach's "אימונים השבוע" included last Thursday's session and the
   client's did not.
6. **One unread message showed a badge of two.** A direct message writes a
   message row *and* a notification pointing at it; the bottom-bar badge added
   the two counts.
7. **Reading a thread never cleared its bell entry** (migration 210002).
8. **Notification preferences crashed the screen on a refusal.** An evening
   reminder set earlier than the morning one — which the two time fields happily
   accept — threw out of the server action, which is the full-page error screen.
   The rules are unchanged; they are answers now. The form moved to
   `NotificationPreferencesForm` so it can show one.
9. **A read message vanished from the coach's to-do list.** The dashboard panel
   filtered on *unread*, so opening a client's question removed it — a coach who
   read it on a phone and meant to reply at a desk arrived to an empty panel. It
   now asks whose turn it is, and says how long they have been waiting.

### Improvement shipped
- Counting unread notifications no longer fetches a page of them.
  `getUnreadNotificationCount` called `getNotificationCenter`, which reads eighty
  notification rows and the whole preferences record — on **every render of the
  client shell and the coach navigation**, i.e. every screen in the product. It
  is a `head: true` count now; `ensure_in_app_reminders` still runs, so reminders
  appear exactly when they did.

### Verification
`tsc` clean · `lint` clean · **471 / 471** tests · `build` passes ·
migration validation passes (69 migrations).

## 2026-08-20 second product review

A second pass over every coach and client screen, focused on defects that are
invisible on screen — figures displayed correctly but computed wrongly, and one
screen that crashed outright. **11 defects fixed, plus every open item and every
proposal the review itself raised.** 18 regression tests added
(`tests/product-review-2026-08-20.test.ts`).

### The one that mattered
`markThreadRead` called `revalidatePath` from inside a page render, which Next
throws on. Its trigger condition is "there is an unread message", so **both
message screens crashed except when there was nothing to read** — the flow this
document already listed as never having been run end to end. The mark now lives
in `lib/messages/repository.ts` with no revalidation.

### Migrations added — applied 2026-08-20 by Eli via the Supabase SQL editor
| Migration | What it does | Why it matters |
|---|---|---|
| `202608200001_resolve_meal_status_overload` | drops the redundant 3-arg `set_meal_day_status` | `202608190002` left two candidates that are ambiguous to Postgres for a 3-arg call (`function ... is not unique`). Dead path today — no screen calls `set_meal_eaten` — but a trap for the next caller. |
| `202608200002_repeat_meal_selections` | `repeat_meal_group_selections(from, to)` | powers "כמו אתמול" on the nutrition screen. Additive only: never overwrites a choice already made today. |

Both are additive, both have rollbacks in `supabase/seeds/`. Confirm with:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_meal_day_status','set_meal_eaten','repeat_meal_group_selections');
```

Three rows, and **exactly one** for `set_meal_day_status` — two means 200001 did
not take and the ambiguity is still there.

### Other defects fixed
1. **Nutrition adherence could never exceed 25%** — it divided logged rows by
   *written* rows, but a group holds a primary plus three alternatives and only
   one is ever eaten. Fed the client file, the alert panel and the generated
   report, which announced "רוב פריטי התפריט אינם מסומנים" about clients who had
   marked everything. Now counted in meals.
2. **`client-report.ts` still read check-ins on the 1-5 scale** after
   `202607280002` moved them to 1-10 — the same class of bug fixed in the client
   file on 2026-08-19, missed in the report generator. Thresholds and every
   printed denominator corrected.
3. **"דורש תשומת לב" fired for every client every day** — two of its three rules
   are true of everyone on a Monday morning. Rules now describe lateness.
4. **"מלא יום מהמועדפים" always reported 0 foods** — counter incremented inside a
   `setState` updater, read before React ran it.
5. **"מאכל ראשי נוסף" arrived scaled down** to be calorie-equivalent to the first
   primary — "ראשי" was read as position rather than as the mark.
6. **The daily-coach cron counted meals across all days** of a multi-day menu.
7. **The dashboard calorie tile printed eaten/remaining** with no words, read by
   everyone as eaten/target.
8. Folded meals followed the position, not the meal, across reorder/delete/day-switch.
9. Duplicate-to-client claimed "no calorie target" when the two targets were equal.
10. The menus search was the one case-sensitive search in the product.

### Open items closed in the same pass
- `/coach/menus/[id]/preview` now marks the primary by `item_role` (was carried
  over unfixed from 2026-08-19, and mattered more once a group can hold two).
- Dead `setMealCompletion` / `setMealItemCompletion` actions removed.
- Workout session: "next exercise" searches forward before wrapping, and the
  unfinished-exercises confirm is its own state rather than "is any warning up".

### Improvements shipped
- **"כמו אתמול"** on the nutrition screen — one tap fills every group still
  waiting with yesterday's choice. This was the most repeated action in the
  product: a five-meal menu with four groups is twenty taps, remade every morning.
- A link to the meal that is due now (the anchor existed; nothing linked to it).
- The check-in now writes weight and navel circumference to `progress_entries`,
  so the graph stops missing weekly weigh-ins.
- The check-in says which number it is and when photos are next required.
- Coach: a "ללא תפריט" view listing active clients with no active menu, linking
  into the builder with the client already selected.
- Coach: the check-in review queue holds its place by check-in id, not by index,
  so marking one handled no longer skips the next.
- The daily-coach cron reads every client in a fixed number of queries instead of
  five sequential round trips each.
- The client file no longer loads weekly summaries and response templates on tabs
  that do not render them.

### Verification
`tsc` clean · `lint` clean · **434 / 434** tests · `build` passes ·
migration validation passes (67 migrations).

## 2026-08-19 product review

A pass over every coach and client screen produced 33 improvements, all
implemented. The full report, with the reasoning behind each one, is the artifact
handed to Eli on 2026-08-19.

### Migrations added (all applied by Eli via the SQL editor on 2026-08-19)
| Migration | What it adds |
|---|---|
| `202608190001_coach_client_messages` | the coach/client direct channel — the product had none |
| `202608190002_meal_substituted_status` | the fourth meal state, "I ate something else", with a note |
| `202608190003_coach_response_templates` | a coach's saved check-in replies |
| `202608190004_substituted_exercise` | `performed_exercise_id` — a swap is recorded, not a skip |
| `202608190005_master_foods_survive_use` | `manual_favorite` nullable, so use is not rejection |

All additive; each has a rollback in `supabase/seeds/`. `restore-master-food-favorites.sql`
is optional and undoes deliberate unstarring — it is a decision, not a migration.

### Defects found during the work, beyond the review's own list
1. **Reopening a saved menu dropped data.** The edit route rebuilt only the
   protein and carbohydrate groups and none of the item roles or notes, so a
   saved fat portion and the vegetables disappeared on reload — and re-saving
   deleted them for real.
2. **The browser refused what the database accepts.** `202608180004` widened
   `save_meal_plan_tree` to fat and vegetables, but `menu-validation.ts` was left
   on the old pair, so filling either group made a menu unsavable client-side.
3. **The curated master list emptied itself through use.** `manual_favorite` was
   `not null default false` and a usage row is created on first *selection*, so
   choosing a curated food demoted it out of favourites permanently. "Fill the
   day from favourites" and "add 3 alternatives" both poisoned the list they
   depend on. Fixed by 190005.
4. **A save that failed looked like nothing happening.** The save button is in a
   sticky bar; its result message was not, so after scrolling through six meals a
   refusal rendered off-screen. Reported by Eli after losing a menu. The message
   now lives inside the sticky bar, errors are red with `role="alert"`, and the
   one combination the server refuses — active with no client — is caught before
   the request.
5. **The status names misled.** "פעיל" was read as "ready", so a coach building a
   bank of menus chose it and hit the client requirement. Renamed to
   "טיוטה — בעבודה" / "מוכן בבנק — ללא שיוך" / "פעיל אצל לקוח — מוגש היום".
6. The client file showed check-in ratings out of 5; the scale moved to 1-10 in
   `202607280002`.
7. `/coach/menus/[id]/preview` marks the first row as primary by position rather
   than by `item_role`. **Not fixed** — display-only, and outside what was verified.

### E2E state
The suite was at 28 failures before this work and none of them were caused by it:
13 are 404s on dead `i.ytimg.com` exercise thumbnails, and the rest were tests
pinning behaviour that had already been deliberately removed — a
`מחיקת המאכל הראשי` button absent from the tree, and an `אוטו׳` string no screen
has ever rendered. Those tests were rewritten to assert current behaviour rather
than deleted. Four further failures *were* caused by this work — a duplicated
field label and the renamed workout-exit buttons — and are fixed.

`building a five-meal menu stays under two minutes` now passes at **~27s**; it
could not save at all before.

## Environments
- Production: `https://start-snowy-eight.vercel.app`, Vercel team `httpselicohenfitnesscoil`, project `start`.
- Supabase project ref: `bacxfweisncnpjgiqxcp`.
- **Preview and Production still share one Supabase database.** Verified by comparing
  `NEXT_PUBLIC_SUPABASE_URL` across both environments. Splitting them needs a second
  Supabase project, which requires account-level access this session does not have.

### Environment variables
| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | yes |
| `NEXT_PUBLIC_SITE_URL` | yes | **missing** — magic links from Preview resolve to the Production URL |
| `E2E_TEST_LOGIN_ENABLED` | **removed** | `true` |
| `E2E_TEST_EMAILS` | **removed** | set 2026-08-05, Preview only |
| `CRON_SECRET` | yes | yes |

Test-account password login verified 2026-08-05 against live markup: present on the
Preview deployment, absent on both `start-snowy-eight.vercel.app` and the custom domain
`start.elicohenfitness.co.il`. Production is closed by two independent conditions —
neither the flag nor the address list is set there.

Canonical production URL is **https://start.elicohenfitness.co.il**.

## Migrations beyond the repo baseline
- `202608020001_curated_master_foods.sql` — **applied** 2026-08-02 via the Supabase SQL
  editor. 53 curated master foods (28 protein, 18 carbohydrate, 7 fat) from Eli's own
  portion table. Idempotent; rollback at `supabase/seeds/curated-master-foods-rollback.sql`.
- `202608020002_background_reminder_scheduler.sql` — **applied** 2026-08-05. Splits the
  reminder rules into `_for_client(uuid)` functions, keeps the originals as wrappers, and
  adds `run_scheduled_reminders()` for the cron. Additive and idempotent; rollback at
  `supabase/seeds/background-reminder-scheduler-rollback.sql`.

## Scheduler — verified end to end 2026-08-05
| Case | Result |
|---|---|
| no token | 401 |
| wrong token | 401 |
| correct token | 200, `{"ok":true,"clients":9,"ms":1300}` |
| immediate re-run | 200, `{"ok":true,"clients":9,"ms":160}` — dedupe keys held, no duplicates |

Reminders now exist whether or not the client opens the app. `vercel.json` registers one daily run at 05:00 UTC
(08:00 Israel in summer), matching the 08:00 morning workout reminder default.

**Vercel is on the Hobby plan, which permits exactly one cron run per day.** A
three-a-day schedule was rejected and failed the deploy. The 19:30 evening workout
reminder therefore cannot fire; restoring it needs a paid plan, which is Eli's call.

## Nutrition engine — current behaviour
- Macro targets: protein 1.8 g/kg, fat 25% of calories, carbohydrate the remainder.
  Grams and percentages both shown; manual override respected; explicit recalculate.
- Calorie target prefills from `client_profiles.calorie_target` on client selection.
- Plan totals count primaries only (`items.slice(0,1)`); free calories are added into
  the daily total on the client screen.
- Alternatives are scaled by `calculateAlternativePortion` — calories weighted 0.9,
  the group macro 0.1 — and marked auto or manual.
- Natural units come from the food source and are rejected for mass and volume units.
  Singular rendering when the quantity is one.
- New menus open with all six fixed meals; untouched meals are dropped on save.
- One-click "3 suggested alternatives" per group, drawn from master foods.
- Meals collapse to a one-line summary.
- Duplicating a plan clears the client, drops to draft and resets macro sources to auto.

## Open items
### Blocked — need something this session cannot obtain
1. **Separate Supabase project for Preview** — needs account-level provisioning.
2. **Payments, subscriptions, App Store** — need Stripe and Apple accounts.
3. **IAP commission structure** — a legal question, explicitly out of scope.
4. **`E2E_TEST_EMAILS`** — the removed value was encrypted and could not be read back.

### Not started
5. ~~E2E suite~~ — done. Playwright, 69 specs green, artifact credential scan wired in.
6. ~~Workouts, check-ins and photo security untested~~ — covered by E2E.
7. Nine of Eli's master foods have no branded catalog equivalent (בטטה, תפוח אדמה,
   אורז לבן, פרכיות and others). The curated master rows cover the coaching use.
8. Self-signup is off — `shouldCreateUser: false`. No free-tier entry path.
9. No product analytics.
10. Client UI redesign is partial: shared shell, tokens and the nutrition screen are
    done; the other client routes still carry the older layout.

## What still needs a person

1. **Nothing is deployed.** All of the above is committed to the local working
   tree only. Eli has been testing against the deployed Preview, which runs the
   pre-review build — which is why none of the improvements were visible to him,
   including the draft autosave that would have saved the menu he lost.
2. **A real run through the four new flows**, per the rule that tests do not close
   a task: a two-day menu, "אכלתי משהו אחר", a workout with a swapped exercise,
   and a message in both directions.
3. **The evening workout reminder still cannot fire as a push.** The scheduler
   runs once a day, in the morning. `vercel.json` now holds three cron entries;
   adding a second daily reminder run at 16:30 UTC is a billing decision and was
   left alone. The preferences screen states what actually happens instead of
   promising a push that cannot arrive.

## Next recommended task — as of 2026-08-21

Everything from the third review is merged, deployed and applied. What is left
needs a person or a purchase:

1. **A real run through the new flows.** Tests do not close a task, and none of
   these have been touched by a human: the nutrition screen's day navigation, the
   coach's message inbox, a two-day menu, withdrawing a check-in.
2. **Two purchases.** A paid Vercel plan for the evening workout reminder (the
   scheduler runs once a day and cannot fire it), and a second Supabase project
   so Preview stops sharing Production's database.

### Older note
Run `202608020002_background_reminder_scheduler.sql` in the Supabase SQL editor so
the cron has something to call, then confirm the daily run by checking the Vercel
function logs the following morning. After that: time a full five-meal menu build
against the two-minute target, and continue the client redesign across the routes
that still carry the older layout.
