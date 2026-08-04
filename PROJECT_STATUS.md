# START - Project Status

Last updated: 2026-08-02 (Claude Code, autonomous session)

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

## Baseline validation — all green
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | pass |
| ESLint | `npm run lint` | pass |
| Tests | `npm test` | **131 / 131** |
| Build | `npm run build` | pass |
| Migration validation | `npm run supabase:migrations:validate` | pass, 42 migrations |

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
| `E2E_TEST_EMAILS` | **removed** | **removed — must be re-added for Preview** |

Test-account password login is now off in Production, verified against the live
`/login` markup. To restore it in Preview, re-add `E2E_TEST_EMAILS` with the two
dedicated addresses; find them with:
`select u.email from auth.users u join public.profiles p on p.id = u.id where p.is_test_account;`

## Migrations beyond the repo baseline
- `202608020001_curated_master_foods.sql` — **applied** 2026-08-02 via the Supabase SQL
  editor. 53 curated master foods (28 protein, 18 carbohydrate, 7 fat) from Eli's own
  portion table. Idempotent; rollback at `supabase/seeds/curated-master-foods-rollback.sql`.
- `202608020002_background_reminder_scheduler.sql` — **written, NOT applied.** Splits the
  reminder rules into `_for_client(uuid)` functions, keeps the originals as wrappers, and
  adds `run_scheduled_reminders()` for the cron. Until it is run, `/api/cron/reminders`
  returns 500 because the RPC does not exist. Additive and idempotent.

## Scheduler
`/api/cron/reminders` is live and verified: an unauthenticated or wrongly-tokened call
returns 401 with an empty body. `vercel.json` registers one daily run at 05:00 UTC
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
5. **E2E suite.** No browser driver is installed and no test-account credentials are
   available since `E2E_TEST_EMAILS` was removed, so nothing can drive a real session.
6. Workouts, check-ins and photo security have not been re-tested since the merge.
7. Nine of Eli's master foods have no branded catalog equivalent (בטטה, תפוח אדמה,
   אורז לבן, פרכיות and others). The curated master rows cover the coaching use.
8. Self-signup is off — `shouldCreateUser: false`. No free-tier entry path.
9. No product analytics.
10. Client UI redesign is partial: shared shell, tokens and the nutrition screen are
    done; the other client routes still carry the older layout.

## Next recommended task
Run `202608020002_background_reminder_scheduler.sql` in the Supabase SQL editor so
the cron has something to call, then confirm the daily run by checking the Vercel
function logs the following morning. After that: time a full five-meal menu build
against the two-minute target, and continue the client redesign across the routes
that still carry the older layout.
