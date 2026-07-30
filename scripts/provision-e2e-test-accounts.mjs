import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const url = required("NEXT_PUBLIC_SUPABASE_URL");
async function serviceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const raw = await new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { value += chunk; });
    process.stdin.on("end", () => resolve(value));
    process.stdin.on("error", reject);
  });
  const parsed = JSON.parse(raw);
  const keys = Array.isArray(parsed) ? parsed : Array.isArray(parsed.keys) ? parsed.keys : Array.isArray(parsed.data) ? parsed.data : [];
  const entry = keys.find((item) => item.name === "service_role" || item.type === "secret");
  const value = entry?.api_key ?? entry?.apiKey ?? entry?.key ?? entry?.value;
  if (!value) throw new Error("A service-role key was not provided.");
  return value;
}
const serviceKey = await serviceRoleKey();
const coachEmail = required("E2E_TEST_COACH_EMAIL").toLowerCase();
const clientEmail = required("E2E_TEST_CLIENT_EMAIL").toLowerCase();
const coachPassword = required("E2E_TEST_COACH_PASSWORD");
const clientPassword = required("E2E_TEST_CLIENT_PASSWORD");

if (coachEmail === clientEmail) throw new Error("Coach and client test emails must differ.");
for (const [label, password] of [["coach", coachPassword], ["client", clientPassword]]) {
  if (password.length < 16) throw new Error(`${label} test password must contain at least 16 characters.`);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function findAuthUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("The auth user list exceeded the safe lookup limit.");
}

async function provision({ email, password, role, fullName }) {
  let user = await findAuthUser(email);
  if (user) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,is_test_account")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_test_account) throw new Error(`Refusing to convert non-test account ${email}.`);
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...user.app_metadata, role, full_name: fullName, is_test_account: true },
      user_metadata: { ...user.user_metadata, full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role, full_name: fullName, is_test_account: true },
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await admin.from("profiles").update({
    full_name: fullName,
    role,
    status: "active",
    is_test_account: true,
  }).eq("id", user.id);
  if (profileError) throw profileError;
  return user;
}

const coach = await provision({
  email: coachEmail,
  password: coachPassword,
  role: "coach",
  fullName: "START E2E Coach",
});
const client = await provision({
  email: clientEmail,
  password: clientPassword,
  role: "client",
  fullName: "START E2E Client",
});

const { error: onboardingError } = await admin.from("client_profiles").upsert({
  user_id: client.id,
  goal: "E2E בלבד",
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}, { onConflict: "user_id" });
if (onboardingError) throw onboardingError;

const { error: relationshipError } = await admin.from("coach_client_relationships").upsert({
  coach_id: coach.id,
  client_id: client.id,
  status: "active",
}, { onConflict: "coach_id,client_id" });
if (relationshipError) throw relationshipError;

console.log(JSON.stringify({
  coach: { id: coach.id, email: coachEmail },
  client: { id: client.id, email: clientEmail },
  isolatedRelationship: true,
  passwordsPrinted: false,
}, null, 2));
