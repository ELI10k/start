# START — Design sprint

Wave one is done and verified. This is the brief for the rest, written so a fresh
session can pick it up without re-deriving anything.

## Where things stand

Branch `integration/start-unified`, all gates green: TypeScript, ESLint,
142 unit tests, build, migrations, and 137 E2E specs across desktop and an
iPhone 13 viewport. Production has not been touched since the freeze.

**Done:** login, client dashboard, bottom navigation, app shell, nutrition.
Every other screen received the shared-primitive upgrade — consistent card
surfaces, inputs, gold buttons, focus rings — but not a dedicated layout.

## The vocabulary to build with

Do not write new CSS for these. They exist and are tested.

| Piece | Where |
|---|---|
| `BottomSheet` | `components/client/BottomSheet.tsx` — focus-trapped, Escape and backdrop close, scroll lock, restores focus |
| `Skeleton`, `SkeletonCard`, `SkeletonList` | `components/client/AppPatterns.tsx` |
| `StateBlock` | same file — `tone="empty" \| "error" \| "success"` |
| `PremiumCard`, `MetricTile` | `components/client/PremiumUI.tsx` |
| `.fab`, `.app-list`, `.state-block`, `.skeleton`, `.sheet` | `app/globals.css` |
| `.dashboard-metrics`, `.quick-actions-grid`, `.daily-progress-card`, `.premium-progress`, `.section-heading` | `app/globals.css` |

`app/page.tsx` is the reference implementation — copy its shape.

## Screens remaining, in order

Ordered by how often a client touches them.

1. **Workouts** (`app/workouts/page.tsx`) — next workout as the hero card, weekly
   completion, history as `.app-list`. FAB: start workout.
2. **Active workout** (`app/workouts/[programId]/[dayId]/page.tsx`) — one exercise
   at a time, thumb-reachable set logging, rest timer, sticky progress. The screen
   most in need of a real mobile layout.
3. **Progress** (`app/progress/page.tsx`) — current weight and change as metric
   tiles, chart, measurements, photo strip. FAB: log weight.
4. **Check-in** (`app/check-in/page.tsx`) — a stepped flow, not one long form:
   weight → measurement → ratings → notes → photos → review.
5. **Menu builder** (`components/coach/menus/PersistentMenuEditor.tsx`) — the food
   picker should be a `BottomSheet` on mobile.
6. **Client list** (`app/coach/clients/page.tsx`) — `.app-list` rows with status.
7. **Client 360** (`app/coach/clients/[id]/page.tsx`) — sectioned, collapsible.
8. **Content** (`app/content/page.tsx`) — cards with category chips.
9. **Notifications** (`app/notifications/page.tsx`) — `.app-list`, unread emphasis.
10. **Profile** (`app/profile/page.tsx`) — grouped settings rows.

Every screen needs a skeleton in its `loading.tsx`, an empty state, and an error
state in `error.tsx`.

## Rules

Feature freeze holds: no new features, no schema changes, no weakening of RLS or
of any test. Presentation only — if a change would alter a number the user sees,
it is out of scope.

Run before moving to the next screen:

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
npm run e2e   # boots its own dev server; scans artifacts for secrets afterwards
```

E2E needs `.env.e2e` — it is gitignored and already populated on this machine.

## Estimate

Four to five working days for all ten, dedicated layouts included. The shared
vocabulary above is what makes that possible; without it, each screen is roughly
three hours instead of forty minutes.
