# Dedicated E2E test accounts

The password login path is strictly for two dedicated test identities. It is disabled by default, uses normal Supabase Auth sessions, and never uses a service-role key in the browser or application runtime.

## Security model

- `profiles.is_test_account` is server-managed and cannot be changed by an authenticated user.
- A database trigger rejects coach-client relationships that cross the test/real boundary.
- The test coach is related only to the test client, so all existing RLS policies continue to apply normally.
- Password login requires all three checks: the server-only feature flag, an exact server-side email allowlist, and `is_test_account = true`.
- Passwords live only in a local ignored environment file or CI secret store. They are never committed, returned by the app, or printed by the provisioning scripts.

## Provision or rotate

Set the following in a secure local shell or CI secret store:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
E2E_TEST_COACH_EMAIL
E2E_TEST_COACH_PASSWORD
E2E_TEST_CLIENT_EMAIL
E2E_TEST_CLIENT_PASSWORD
```

Use dedicated addresses that do not belong to a coach or client. Passwords must be at least 16 characters. Then run:

```bash
node scripts/provision-e2e-test-accounts.mjs
```

The script is idempotent, rotates the two passwords, refuses to convert an existing non-test account, and creates only one isolated test relationship.

For the project-maintainer setup, the two generated passwords are stored in
macOS Keychain under `START E2E Coach` and `START E2E Client`. They are not
application environment variables and are never written to this repository.

Enable the login surface during a test window with server-only Vercel variables:

```text
E2E_TEST_LOGIN_ENABLED=true
E2E_TEST_EMAILS=<coach-test-email>,<client-test-email>
```

Redeploy, open `/login`, choose “כניסה לחשבון בדיקה”, and enter a dedicated test credential. Magic Link remains the only login path for regular users.

## Disable before launch

1. Set `E2E_TEST_LOGIN_ENABLED=false` and remove `E2E_TEST_EMAILS` from the deployment environment.
2. Redeploy.
3. Run `node scripts/disable-e2e-test-accounts.mjs`. This disables both profiles and revokes their device sessions.
4. To permanently delete the two Auth users and all cascading test data, run the same command with `E2E_TEST_DELETE_USERS=true`.
5. Remove the test credentials from the password manager or CI secret store.

Disabling the UI alone is not the revocation step; always disable the profiles as well.
