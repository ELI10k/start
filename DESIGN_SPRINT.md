# START — Design sprint

All ten screens are done. This records what the sprint produced and the rules
that still bind, so a fresh session can pick it up without re-deriving anything.

## Where things stand

Branch `integration/start-unified`, all gates green: TypeScript, ESLint,
142 unit tests, build, 43 migrations validated, and 138 E2E specs across desktop
and an iPhone 13 viewport (2 skipped — they need a second client identity).
Production has not been touched since the freeze.

## The palette is closed

White surfaces. Black text, stepped by opacity. One green, `#16A34A`, for every
positive or actionable state. One red, `#DC2626`, for everything wrong. No gold,
no grey as a brand colour, no dark mode — `globals.css` declares no dark variant,
so there is no second palette to fall back to.

`scripts/normalize-palette.mjs` sweeps any stray value back onto it and is
idempotent; run it after a large merge.

## The vocabulary to build with

Do not write new CSS for these. They exist and are tested.

| Piece | Where |
|---|---|
| `BottomSheet` | `components/client/BottomSheet.tsx` — focus-trapped, Escape and backdrop close, scroll lock, restores focus |
| `Skeleton`, `SkeletonCard`, `SkeletonList` | `components/client/AppPatterns.tsx` |
| `StateBlock` | same file — `tone="empty" \| "error" \| "success"` |
| `PremiumCard`, `MetricTile`, `ProgressBar`, `ProgressRing` | `components/client/PremiumUI.tsx` |
| `.fab`, `.fab--bare`, `.app-list`, `.state-block`, `.skeleton`, `.sheet` | `app/globals.css` |
| `.pill`, `.chip-row`, `.chip`, `.settings-group`, `.collapse` | same |
| `.step`, `.step-progress`, `.rating-scale`, `.photo-slot` | same — the check-in flow |
| `.session-sticky`, `.set-row`, `.session-actions`, `.rest-timer` | same — the active workout |
| `.food-picker`, `.food-row`, `.content-card` | same |

`app/page.tsx` is the reference implementation — copy its shape.

## Screens delivered

1. **Workouts** — the day as the one inverted surface, metrics as scrolling
   tiles, week and history as list rows, start as a FAB, move-to-another-day and
   the snooze/skip actions in sheets.
2. **Active workout** — one exercise at a time, a set is one row, sticky
   progress and a sticky previous/next bar, the rest timer on green.
3. **Progress** — opens on four tiles, logging a weight is a FAB and a sheet,
   the measurement table became rows, the photo comparison stacks on a phone.
4. **Check-in** — six numbered steps with a live progress bar and a sticky
   submit. Every field stays in the document (see the constraint below).
5. **Menu builder** — one food picker for the whole editor, in a sheet; food
   rows are a grid; the sticky bar carries the running calorie total.
6. **Client list** — one row per client, sort as links, new client as a FAB.
7. **Client 360** — four tiles, one alert block, everything else a collapsible
   section; account actions including reset device behind a heading.
8. **Content** — progress on the card, categories as chips, empty state names
   the category.
9. **Notifications** — list rows with unread tinted, preferences collapsed.
10. **Profile** — grouped settings rows plus the navigation the screen lacked.

Every one has a skeleton in `loading.tsx`, an empty state and an `error.tsx`.

## Constraints worth knowing before you change these

- **The check-in cannot hide its steps.** It posts as one form, and the suite
  asserts every field is reachable on load. Steps are marked complete live
  rather than gated.
- **The food picker sheet opens from "בחירת מאכל ראשי".** The E2E helper clicks
  that button and then expects the search combobox to be visible without a
  second click.
- **The client's main navigation has one accessible name** across the desktop
  bar and the bottom bar; exactly one is rendered per breakpoint. The mobile
  E2E project asserts it by name.
- Several components are asserted by **source text** in `tests/*.test.ts` —
  exact Hebrew strings and code fragments. Run `npm test` after any rewrite.

## Rules

Feature freeze holds: no new features, no schema changes, no weakening of RLS or
of any test. Presentation only — if a change would alter a number the user sees,
it is out of scope.

Run before moving on:

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
npm run e2e   # boots its own dev server; scans artifacts for secrets afterwards
```

E2E needs `.env.e2e` — it is gitignored and already populated on this machine.

## What is left

Nothing in this sprint. Outside it, and unchanged: `components/client/ClientProfile.tsx`,
`components/client/ClientPreferences.tsx`, `components/coach/ClientsDirectory.tsx`
and `components/coach/ClientCard.tsx` are unreferenced demo components still
importing mock data. They were left alone because deleting them is not a design
change.
