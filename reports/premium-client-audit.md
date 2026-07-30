# START Premium Client Experience — Audit

## Client routes

- `/` — dashboard, sourced from `getClientOverview` and workout provider.
- `/nutrition` — active/free menu, foods and meal completion server actions.
- `/progress`, `/progress/measurements` — persisted measurements and progress history.
- `/check-in`, `/check-in/history` — persisted check-ins, photos and coach feedback.
- `/workouts` and nested program, session, history, exercise and progress routes — workout provider and Supabase workout repository.
- `/content` and nested item/category routes — published content repository and engagement actions.
- `/notifications` — notification repository, read actions and preference actions.
- `/profile`, `/preferences`, `/support` — authenticated client profile and preferences.
- `/login`, `/onboarding`, `/auth/*` — authentication and onboarding surfaces; visually covered by global tokens only.

## Protected functionality

The redesign does not change server actions, repositories, Supabase clients, API routes,
auth/session handling, data types, calculations, permissions, workout persistence,
nutrition calculations, check-in storage or notification creation.

## Shared design surface

- `app/globals.css` — shared global stylesheet; highest merge-conflict risk.
- `app/layout.tsx` — shared root layout; changed only to load Assistant.
- `app/page.tsx` — client dashboard plus server data loading.
- `components/client/ClientShell.tsx` — shared client-only navigation shell.
- `components/BottomNav.tsx` — client bottom navigation.
- `components/client/PageHeader.tsx` — client page heading.

`components/client/PremiumUI.tsx` is new and isolates reusable visual primitives from
business logic.

## Design system

Tokens cover the supplied background, card, border, gold, text, status, spacing,
radius, shadow and animation values. Shared primitives cover cards, metrics,
progress bars and progress rings. Existing forms, loading states, empty states,
tables, notifications and workout controls inherit the same design language without
changing their behavior.
