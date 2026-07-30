# Backend and authentication sprint report

Date: 2026-07-20

## 1. Implemented functionality

The repository now contains a Supabase/PostgreSQL persistence architecture using the official `@supabase/ssr` and `@supabase/supabase-js` packages. Passwordless email login, callback exchange, secure logout, session refresh, role routing, request guards, client-device enforcement, database repositories, server actions, and Hebrew save/error states are implemented at code level.

Database-backed vertical flows now cover:

- Coach dashboard, assigned-client search/filter/list/detail, latest progress/check-ins/menu, device reset, menu directory, transactional menu create/edit/assignment/activation, meal and item editing, server-authoritative macro calculation, and preview.
- Client dashboard, active menu, daily targets and completion summary, meal details, completion/undo by date, progress submission/history, check-in submission/history/coach response, and published content.
- Foods are imported idempotently from the unchanged approved 336-record JSON source and runtime food routes query the database. Missing nutrition values remain null.

Workout functionality remains excluded.

## 2. Database tables and relationships

The initial schema creates `profiles`, `coach_client_relationships`, `client_profiles`, `foods`, `menus`, `menu_days`, `meals`, `meal_items`, `meal_completion_logs`, `progress_entries`, `check_ins`, `content_items`, and `device_sessions`.

Auth users own profiles. Coach-client relationships scope coach reads and menu assignments. Menus own days, days own meals, and meals own items referencing approved foods. Client-owned completion, progress, check-in, and device rows cascade with the profile. Food deletion is restricted when referenced. A partial unique index permits only one active menu per client.

## 3. Migrations created

- `202607200001_initial_product.sql`: enums, tables, foreign keys, constraints, indexes, timestamps, RLS, access helpers, device activation/reset RPCs.
- `202607200002_secure_mutations.sql`: protected profile authority fields, transactional menu-tree persistence with database macro recalculation, and assigned-meal completion RPC.
- `202607200003_rls_hardening.sql`: prevents direct completion of unassigned meals, prevents profile email/role/status escalation, and restricts coach check-in edits to review fields.

`npm run supabase:migrations:validate` performs deterministic structural validation. The official Supabase CLI was initialized, but live Postgres lint/application is blocked because this workspace has neither Docker/Postgres nor a linked Supabase project.

## 4. Authentication flow

`/login` sends an email OTP/magic link with account auto-creation disabled. `/auth/callback` exchanges the code for a cookie-backed session, validates an active profile, registers the client device, and redirects coaches to `/coach` or clients to `/`. `/auth/logout` invalidates the Supabase session and redirects to login. `/unauthorized` provides role/device explanations in Hebrew.

Next.js 16 `proxy.ts` refreshes cookies and performs optimistic route, role, and device checks. Server repositories/actions repeat identity and role checks, while RLS remains the authoritative data boundary. Foods are shared by both authenticated roles; coach and client private areas are mutually exclusive.

## 5. One-device-session behavior

The browser generates a stable non-secret device identifier before login. On successful client authentication, `activate_current_device` revokes every other active device row and activates the current row in one database transaction. Every subsequent private client request must present a cookie matching a non-revoked database row. A replaced device is signed out on its next request and receives a Hebrew explanation. Coaches are not device-restricted. The coach “איפוס מכשיר” action calls an RLS-protected RPC and revokes the assigned client’s active row.

This prevents concurrent active client sessions across different device identifiers; it does not prevent physical sharing of one device.

## 6. RLS policies

Clients can read/update their own allowed profile data, read only their active assigned menu tree, manage only their own valid completion/progress/check-in rows, and read published content. Completion policies verify that the meal belongs to the client’s active menu.

Coaches can read only active assigned clients and their client-profile/progress/check-in data, and can manage only menus they own for assigned clients. Security-definer relationship helpers expose only boolean/role results. Profile authority fields and client-authored check-in fields have trigger protection beyond row ownership.

Foods are read-only to authenticated users through RLS; imports use the server-only service role.

## 7. Frontend flows connected to persistence

Core coach and client routes listed above call `lib/data/product-repository.ts` and server actions rather than mock arrays/localStorage. Existing presentation-only demo providers remain for legacy profile/preferences components, but do not back the newly connected dashboard, nutrition, progress, check-in, coach-client, menu, content, or food flows.

## 8. Test results

- `npm test`: 30 passing, 0 failing.
- Tests cover role authorization, relationship isolation, client/coach device behavior, RLS migration presence, server food macro calculation, active-menu replacement, food validation/search/quantities, menu calculations/duplication, progress/check-in validation, and adapter behavior.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- Structural migration validation: pass.
- Unauthenticated route guards: `/`, `/coach`, `/nutrition`, and `/foods` return 307 to `/login`; `/login` and `/unauthorized` return 200.

Live RLS/auth repository integration tests could not run without a database and project credentials.

## 9. Build result

`npm run build` passes with Next.js 16.2.10. Authenticated routes are request-rendered so Supabase secrets are not required during compilation.

## 10. Exact blockers

1. No `NEXT_PUBLIC_SUPABASE_URL`, anon key, service-role key, linked project, database password, or permitted seed email destinations were provided. Therefore migrations, 336-food database import, development seed, magic-link delivery, RLS direct-request verification, and authenticated end-to-end route checks could not be executed against Supabase.
2. Docker, PostgreSQL, and `psql` are absent. The official `supabase db lint --level error` attempt failed to connect to local Postgres, so PL/pgSQL compilation remains unverified by a real engine.
3. `npm audit --omit=dev` reports two moderate advisories in Next.js’s bundled PostCSS with only a breaking/incorrect forced downgrade offered, and one high `xlsx` advisory with no published fix. The workbook importer should be isolated or replaced before accepting untrusted spreadsheets.

## 11. Required manual setup

1. Create a Supabase project and copy `.env.example` to `.env.local` with real values.
2. Configure Auth site URL and redirect allow-list for `/auth/callback`; configure production SMTP before real use.
3. Link the CLI (`npx supabase link --project-ref ...`) and run `npx supabase db push`, or start Docker and run `npx supabase db reset` locally.
4. Run `npm run supabase:migrations:validate`, `npm run supabase:foods:import`, and `npm run supabase:foods:verify`.
5. Set development seed email addresses and run `npm run supabase:seed`; verify magic links through the configured email channel.
6. Generate database types from the applied schema with `npx supabase gen types typescript --linked` and replace the provisional type surface.
7. Execute authenticated role/RLS/device journeys in a disposable development project before deployment.

## 12. Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — local/server seed/import scripts only
- `NEXT_PUBLIC_SITE_URL`
- `SEED_COACH_EMAIL`
- `SEED_CLIENT_ONE_EMAIL`
- `SEED_CLIENT_TWO_EMAIL`

No values or passwords are committed.

## 13. Recommended next product sprint

Apply and validate migrations in a real development Supabase project; generate exact database types; add pgTAP RLS tests and browser-level magic-link/device tests; add optimistic concurrency/versioning for simultaneous menu edits; implement coach check-in responses in the UI; migrate legacy profile/preferences storage; configure production email, monitoring, backups, retention, and deployment; and replace/isolate the vulnerable spreadsheet parser. Do not begin workout development until official programs are supplied.
