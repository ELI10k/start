import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const admin = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);
const emails = [
  required("E2E_TEST_COACH_EMAIL").toLowerCase(),
  required("E2E_TEST_CLIENT_EMAIL").toLowerCase(),
];

const { data: profiles, error: profileError } = await admin
  .from("profiles")
  .select("id,email,is_test_account")
  .in("email", emails);
if (profileError) throw profileError;
if (profiles.length !== 2 || profiles.some((profile) => !profile.is_test_account)) {
  throw new Error("Refusing to disable accounts that are missing or not marked as test accounts.");
}

const { data: disabledCount, error: disableError } = await admin.rpc("disable_e2e_test_accounts");
if (disableError) throw disableError;

let deleted = 0;
if (process.env.E2E_TEST_DELETE_USERS === "true") {
  for (const profile of profiles) {
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) throw error;
    deleted += 1;
  }
}

console.log(JSON.stringify({ disabledCount, deleted, passwordsPrinted: false }, null, 2));
