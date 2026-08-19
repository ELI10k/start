# START - Project Status

Last updated: 2026-08-19 — product review implemented. The 2026-08-09 feature
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

Production runs `main` @ `a3f7cf3`.

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

## Next recommended task
Run `202608020002_background_reminder_scheduler.sql` in the Supabase SQL editor so
the cron has something to call, then confirm the daily run by checking the Vercel
function logs the following morning. After that: time a full five-meal menu build
against the two-minute target, and continue the client redesign across the routes
that still carry the older layout.
