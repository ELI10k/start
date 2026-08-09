# START — Feature Complete

Declared 2026-08-09 on `integration/start-unified`.

This records what the core product does today, verified by a real browser rather
than by inspection. It is the baseline the design sprint must not regress.

## Gates at the freeze

| Check | Result |
|---|---|
| TypeScript | pass |
| ESLint | pass |
| Unit tests | 142 / 142 |
| Build | pass |
| Migration validation | pass, 43 migrations |
| E2E | 69 specs, 1 skipped (needs a second client identity) |
| Credential scan of E2E artifacts | clean |

**Coach builds a full five-meal menu in ~30 seconds**, measured end to end in the
browser against a two-minute target.

## Verified by E2E

**Auth and permissions.** Coach and client sign-in; session survives a new context;
logout revokes and re-login works; an expired session lands on `/login`, never on
`/unauthorized`; 13 route guards; a client cannot reach any coach route and a coach
cannot reach client-only screens; test-account login exists only outside Production.

**Nutrition.** Six-meal skeleton on a new menu; client selection prefills the calorie
target and derives protein 1.8 g/kg, fat 25%, carbohydrate remainder, shown in grams
and percent; master foods first in the picker; Hebrew and English search; natural
units from the source; primary plus alternatives with calculated quantities;
one-click suggested alternatives arriving marked auto; meal collapse; empty menu
refused with a readable message; save, reload and edit persist.

**Check-in and progress.** Every required field; 1–10 ratings; three photo slots;
weight and navel required; history and progress render; **no check-in photo is ever
served from a public storage URL**.

**Workouts.** Client and coach screens, history, progress, and the permission
boundary between them.

**Content and notifications.** Coach list and editor; client library and categories;
unpublished content is not reachable by a client; notification centre and
preferences; every in-app notification link resolves to a real route; the scheduler
endpoint rejects a missing or wrong token.

## Product bugs found and fixed during verification

1. A regular meal required both a protein and a carbohydrate group, so a
   protein-only breakfast could not be saved at all.
2. Egg white showed 1716 kcal per 100 g instead of 52 — a `package_unit` of "גרם"
   was being read as a countable unit weighing 33 g each.
3. Workout routes rendered `<main>` inside `ClientShell`'s `<main>`.
4. Next 16 blocked its own dev resources from `127.0.0.1`, so **no client component
   hydrated on the dev server at all**.
5. The macro message blamed a missing weight when the calorie target was what was
   missing.
6. Migration validation aborted on a false positive, leaving 24 migrations unchecked.
7. A device id shorter than 16 characters was rejected silently, bouncing clients
   back to `/login`.
8. Playwright recorded the test-account password into six artifacts. The suite no
   longer types a password at all, and a scanner fails the run if any secret reaches
   an artifact.

## Not in scope for the freeze

Blocked on something outside the codebase: a second Supabase project for Preview
isolation; payments, subscriptions and store distribution; the 19:30 workout
reminder (Vercel Hobby allows one cron run per day); nine of Eli's master foods that
have no branded catalog equivalent and need source values.

Deliberately deferred: self-signup, analytics, START IQ.

## Freeze rule

Until the design sprint ends, changes are limited to visual work, bug fixes and
tests. No new features, no schema changes, no weakening of RLS or of any check.
