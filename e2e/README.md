# E2E

Playwright drives a real browser against a real Supabase project. The suite splits in
two: specs that need no account, and specs that sign in as a dedicated test account.

## What runs without any setup

```bash
npm run e2e
```

Boots a dev server on port 3100 using the public Supabase values in `.env.e2e`, then
runs the credential-free specs: RTL rendering, route guards for every client and coach
route, the login redirect carrying `next=`, the cron endpoint rejecting bad tokens, and
a 320 px no-horizontal-scroll check. Everything that needs a session is skipped and
reported as skipped, never as passed.

## Running the authenticated specs

The signed-in specs need the two dedicated test accounts. **Set these in your own shell
and never commit them** — `.env.e2e` is gitignored, and nothing in this repo reads or
prints their values:

```bash
export E2E_COACH_EMAIL='...'
export E2E_COACH_PASSWORD='...'
export E2E_CLIENT_EMAIL='...'
export E2E_CLIENT_PASSWORD='...'
# only needed by the cross-client isolation specs
export E2E_CLIENT_TWO_EMAIL='...'
export E2E_CLIENT_TWO_PASSWORD='...'
npm run e2e
```

Find the two addresses with:

```sql
select u.email from auth.users u
  join public.profiles p on p.id = u.id
 where p.is_test_account;
```

The passwords are the ones set by `scripts/provision-e2e-test-accounts.mjs`; the
project maintainer keeps them in the macOS Keychain under `START E2E Coach` and
`START E2E Client`.

## Safety

- `assertNotProduction` refuses to run against `start.elicohenfitness.co.il` or
  `start-snowy-eight.vercel.app`. Every writing spec calls it in `beforeAll`.
- Writes only ever happen as the test accounts, which the database keeps isolated via
  `profiles.is_test_account` and a trigger that rejects test/real coach-client links.
- Menus created by the suite are named `E2E …` with a timestamp so they are easy to
  identify and remove.
- The test-account login path only exists where `E2E_TEST_LOGIN_ENABLED` and
  `E2E_TEST_EMAILS` are both set — Preview and local development, never Production.

## Running against a Preview deployment

```bash
E2E_BASE_URL=https://<deployment>.vercel.app npm run e2e
```

Preview deployments sit behind Vercel SSO, so this needs a protection-bypass token
configured on the project. Without one, use the local dev server.

## Artifacts

Failures keep a trace, a screenshot and a video under `reports/e2e/`. Open the last
run with `npm run e2e:report`, or a single trace with
`npx playwright show-trace reports/e2e/<test>/trace.zip`.
