# START - Project Status

Last handoff date: 2026-07-30
Last audit: 2026-07-30 (Claude Code, initial repository audit — no code changed)

## Repository
- Root: `/Users/lykhn/start`
- Remote: `https://github.com/ELI10k/start.git`
- Second worktree: `/Users/lykhn/start-premium-client-experience` on branch `codex/start-premium-client-experience`

## Current branch
`main` — **working tree is dirty: 92 changed/untracked paths.**
`main` is 0 ahead / 2 behind `codex/start-premium-client-experience`.

## Latest commits
- `2395b12` 2026-07-17 "Add new client nutrition calculator" (`main`, `origin/main`)
- `352f5a8` 2026-07-29 "Redesign client experience with light health UI" (`codex/...`)
- `02e33ee` 2026-07-29 "Build premium client app experience"

**Critical:** almost the entire application (all `app/coach/*`, `app/workouts/*`,
`app/api/*`, `components/client/*`, most `lib/*` modules, 40+ migrations, 18 test
files) is **untracked on `main`** and therefore not pushed. The newest nutrition
work (`lib/nutrition/master-foods.ts`, `lib/nutrition/meal-alternatives.ts`,
migrations `202607290002`–`202607290007`, `lib/check-ins/photo-cycle.ts`) exists
**only as uncommitted files on disk**. It is not on any branch and not on the remote.

## Production
Previously reported URL: `https://start-snowy-eight.vercel.app` — **not verified**
(requires Vercel dashboard access).
Supabase project ref: `bacxfweisncnpjgiqxcp`.

## Preview
Unknown — not verified.

## Baseline validation — re-run 2026-07-30 on `/Users/lykhn/start`
| Check | Command | Result | Notes |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS | exit 0 |
| ESLint | `npm run lint` | PASS | no output |
| Tests | `npm test` | **118 pass / 1 fail** | see below |
| Build | `npm run build` | PASS | 55 routes, all dynamic |
| Migration validation | `npm run supabase:migrations:validate` | **FAIL** | see below |
| E2E | — | not run | no E2E runner exists in `package.json` |

### Failing test
`tests/date-time.test.ts:24` — "date and time displays declare the Israel timezone".
It shells out to `rg` via `spawnSync`; `result.status` is `null`, meaning the
process never spawned. **Ripgrep is not installed as a binary on this machine**
(only a shell function exists). This is an environment/test-design defect, not a
product defect — but as written the test cannot detect real violations either.

### Failing migration validation
`202607210002_daily_tasks_and_reminders.sql` is not wrapped in `begin;`/`commit;`.
The validator throws on it, so **every later migration is left unvalidated**.

## Architecture (verified)
- Next.js 16.2.10, React 19.2.4, App Router, TypeScript, Tailwind v4.
- Supabase `@supabase/ssr`; session/role routing in `proxy.ts` (middleware).
- 55 routes, all server-rendered on demand.
- 41 SQL migrations in `supabase/migrations/`, all with RLS enabled.
- 18 test files, `node --test` with `--experimental-strip-types`.
- Storage: private bucket `check-in-photos`, `upsert: false` (`lib/check-ins/photo-storage.ts`).
- No `vercel.json`, no `pg_cron`, no `pg_net` — **there is no scheduler**.

## Confirmed gaps vs the handoff document
1. **The "premium client experience" branch is dark/gold, not white/green.**
   Commit `352f5a8` is titled "light health UI" but `app/globals.css` at that
   commit defines `--background: #0a0a0a`, `--start-card: #161616`,
   `--start-gold: #d4af37`. It contradicts the UI direction in `CLAUDE.md`
   (white/light-gray base, green accent). Another report-vs-reality mismatch.
2. **Two divergent lines of work, neither merged.** `main`'s dirty worktree holds
   the newest nutrition engine; the codex branch holds the client visual redesign
   and lacks the nutrition work entirely. 49 paths differ on disk between the
   two worktrees.
3. **Coach menu builder is still black/gold.** `components/coach/menus/PersistentMenuEditor.tsx`
   uses `#17150F`, `#3A321B`, `#D4AF37` inline. 98 files under `app/` and
   `components/` still reference the gold palette.
4. **Notifications are pull-based only.** `lib/notifications/repository.ts:55`
   calls the `ensure_in_app_reminders` RPC when the notifications page loads.
   Nothing generates reminders while the app is closed — no cron, no push.
5. **Master foods are hardcoded numeric string IDs.** `lib/nutrition/master-foods.ts`
   is 19 lines of literal `"1","2","3",...` sets. It will silently break if food
   IDs change on re-import, and it is not traceable to Eli's curated list.

## Items reported fixed since the last handoff (need Eli's manual confirmation)
`reports/food-catalog-audit-2026-07-29.md` claims 336/336 foods present in
Production, 28 results for `גבינה`, and master foods first in the picker.
The code is consistent with this: `lib/nutrition/macro-targets.ts` uses 1.8 g/kg
protein and 25% fat; `lib/nutrition/menu-validation.ts` defines the six fixed meal
types including `קלוריות חופשיות`. **Not verified in a live browser during this audit.**

## Known risks
- Uncommitted, unpushed work is the single largest risk: a `git checkout`,
  `git stash` or `git clean` would destroy the newest nutrition engine.
- Completion reports have repeatedly contradicted reality (see gap #1).
- Migration validation is silently short-circuiting.
- Preview-only work has previously reached Production.

## Next recommended task
Commit the uncommitted `main` work onto a dedicated branch and push it, so it is
recoverable, then decide how to reconcile it with
`codex/start-premium-client-experience`. Only after that: fix the migration-wrapping
failure and the `rg` test, then run the live nutrition acceptance scenario in a browser.
