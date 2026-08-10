# START — beta run to TestFlight

Working log for the continuous run. Updated as each stage lands so the work survives
a context reset. Branch: `integration/start-unified`.

| # | Stage | State | Notes |
|---|---|---|---|
| 1a | `/coach/menus/[id]` load time | done | `cfd2028` — 1417ms → 1035ms median; 6 concurrent opens all 200 |
| 1b | free calories "eaten" never closes | done | `cfd2028` — needs the migration applied |
| 2 | meal status "not eaten" | done | `cfd2028` — needs the migration applied |
| 3 | auth + email branding | in progress | |
| 4 | workout templates from the workbooks | todo | data layer already imported: 7 programs, 58 exercises |
| 5 | flexible program builder | todo | |
| 6 | demo client gets a real program | todo | |
| 7 | barcode scanning | todo | |
| 8 | AI nutrition-label reading | todo | |
| 9 | steps / HealthKit / Health Connect | todo | |
| 10 | real push notifications | todo | |
| 11 | weekly AI coach summary | todo | |
| 12 | basic offline | todo | |
| 13 | analytics + crash reporting | todo | |
| 14 | Capacitor | todo | |
| 15 | TestFlight / Play internal | todo | |
| 17 | full QA | todo | |

## Correction to the stage 1a commit message

`cfd2028` says the unbounded client scans "were what crossed the database statement
timeout". Measured afterwards with `scripts/perf-menu-load.mjs` against the live
database, that is not true:

```
   488ms  foods count(head)                  count=389
   345ms  foods full catalog (current)       rows=389
   169ms  meal_plans list                    rows=5
   286ms  meal_items for plan                rows=24
   133ms  progress_entries .in(ids) ALL      rows=3
   131ms  check_ins .in(ids) ALL             rows=2
   144ms  device_sessions .in(ids) ALL       rows=1
```

No leg is slow, and the "unbounded" scans return single-digit row counts. The
optimisation is still worth having — three fewer round trips and bounded queries —
but the 3-11s renders and the 57014 timeouts came from running 150+ specs against
one dev server and one Supabase project at once, not from query volume. On Vercel,
without that load, the route was never the problem it looked like.

Kept as a standing risk: the E2E suite and Production share one Supabase project.

## Blocked on something outside the repo
_(recorded as found)_

- **`202608100001_meal_day_status.sql` is not applied.** No service-role key and no
  database connection string in this environment, so DDL cannot be run from here.
  Apply it in the Supabase SQL editor; rollback at
  `supabase/seeds/meal-day-status-rollback.sql`. Until then the code reads every
  meal as unmarked and `e2e/meal-status.spec.ts` skips itself.
