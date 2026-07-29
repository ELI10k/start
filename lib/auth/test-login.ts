const TRUTHY = new Set(["1", "true", "yes", "on"]);
type TestLoginEnvironment = Readonly<Record<string, string | undefined>>;

export function getE2ETestEmails(environment: TestLoginEnvironment = process.env) {
  return new Set(
    (environment.E2E_TEST_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isE2ETestLoginEnabled(environment: TestLoginEnvironment = process.env) {
  return TRUTHY.has((environment.E2E_TEST_LOGIN_ENABLED ?? "").trim().toLowerCase())
    && getE2ETestEmails(environment).size > 0;
}

export function isAllowedE2ETestEmail(email: string, environment: TestLoginEnvironment = process.env) {
  return isE2ETestLoginEnabled(environment) && getE2ETestEmails(environment).has(email.trim().toLowerCase());
}
