# START — beta run to TestFlight

Working log for the continuous run. Branch: `integration/start-unified`.

| # | Stage | State | Notes |
|---|---|---|---|
| 1a | `/coach/menus/[id]` load time | done | `cfd2028`, corrected in `5a892b8` — 1156ms median, 6 concurrent opens all 200 |
| 1b | free calories "eaten" never closes | code done | `cfd2028` — **needs the migration applied** |
| 2 | meal status "not eaten" | code done | `cfd2028` — **needs the migration applied** |
| 3 | auth + email branding | done | both templates + 3 screens; applying the templates is a dashboard action |
| 4 | workout templates from the workbooks | done | verified in the database: 7 programmes, 11 days, 100 entries, 100 linked |
| 5 | flexible program builder | partial | reorder / add / delete / edit exist; no drag-and-drop, replace or duplicate |
| 6 | demo client gets a real program | done | `5a892b8` — FBW gym, 11 exercises, 11 links |
| 7 | barcode scanning | not started | |
| 8 | AI nutrition-label reading | blocked | no vision API credential |
| 9 | steps / HealthKit / Health Connect | not started | needs Capacitor first |
| 10 | real push notifications | blocked | needs APNs/FCM credentials |
| 11 | weekly AI coach summary | not started | |
| 12 | basic offline | not started | |
| 13 | analytics + crash reporting | not started | |
| 14 | Capacitor | not started | |
| 15 | TestFlight / Play internal | blocked | needs Apple + Google developer accounts |
| 17 | full QA | done for what shipped | 152 unit, 25-screen sweep, interaction suite, perf budget |

## What stage 4 could not have

The workbooks carry: muscle group, exercise name, sets, reps, rest, a notes
column, and a hyperlink per exercise in the two bank sheets. They do **not**
carry technique explanations, common mistakes, or an equipment field.

Of the per-exercise asks in the brief:

- exact link — **73 exercises, 55 with a source-traced URL**; the other 18 have no
  link in any workbook
- working muscles — **73 of 73**
- equipment — 15 of 73; the remaining 58 have only the bank's own class
  ("משקל גוף" / "משקולות ומכונות") in `category`
- technique explanation — 15 of 73, from an earlier curation
- common mistakes — **no source anywhere**

Writing the missing technique and mistakes text would be inventing coaching
instruction, which the brief forbids and which is a safety matter for exercise
cues specifically. The exercise screen already states this honestly: it labels
what it shows "הנחיות ביצוע מהמקור" and says "לא נמצא קישור וידאו בקובץ המקור"
when there is none.

## Correction to the stage 1a commit message

`cfd2028` says the unbounded client scans "were what crossed the database
statement timeout". Measured afterwards with `scripts/perf-menu-load.mjs`:

```
   488ms  foods count(head)                  count=389
   345ms  foods full catalog                 rows=389
   133ms  progress_entries .in(ids) ALL      rows=3
   131ms  check_ins .in(ids) ALL             rows=2
   144ms  device_sessions .in(ids) ALL       rows=1
```

No leg is slow and the scans return single-digit rows. The optimisation is still
worth having, but the 3-11s renders and the 57014s came from 150+ specs against
one dev server and one Supabase project, not from query volume.

The food-catalogue cache added in `cfd2028` was reverted in `5a892b8`: the read
needs the caller's session, and a Supabase server client reads `cookies()`, which
Next forbids inside `unstable_cache`. It threw on every `/nutrition` request.

## Blocked on something outside the repo

1. **`202608100001_meal_day_status.sql` is not applied.** No service-role key and
   no database connection string here, so DDL cannot run from this environment.
   Apply it in the Supabase SQL editor; rollback at
   `supabase/seeds/meal-day-status-rollback.sql`. Until then every meal reads as
   unmarked and `e2e/meal-status.spec.ts` skips itself.
2. **The email templates are not applied.** `supabase/templates/*.html` have to be
   pasted into the Supabase Auth template settings.
3. **AI label reading** needs a vision API key.
4. **Push** needs APNs and FCM credentials.
5. **TestFlight and Play internal testing** need Apple and Google developer
   accounts.
6. Preview and Production still share one Supabase project.
