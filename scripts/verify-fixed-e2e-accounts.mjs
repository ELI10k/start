import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};
const url = required("NEXT_PUBLIC_SUPABASE_URL");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://start-snowy-eight.vercel.app").replace(/\/$/, "");
async function publicApiKey() {
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  const html = await (await fetch(`${siteUrl}/login`)).text();
  const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => new URL(match[1], siteUrl).href);
  for (const source of sources.slice(0, 40)) {
    const script = await (await fetch(source)).text();
    const publishable = script.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
    if (publishable) return publishable;
    const legacy = script.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
    if (legacy) return legacy;
  }
  throw new Error("The public Supabase API key was not found in the deployed client bundle.");
}
const anonKey = await publicApiKey();
const coachEmail = required("E2E_TEST_COACH_EMAIL").toLowerCase();
const coachPassword = required("E2E_TEST_COACH_PASSWORD");
const clientEmail = required("E2E_TEST_CLIENT_EMAIL").toLowerCase();
const clientPassword = required("E2E_TEST_CLIENT_PASSWORD");
const realClientId = process.env.E2E_REAL_CLIENT_GUARD_ID?.trim();

const must = (response, label) => {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data;
};
const assert = (condition, label) => {
  if (!condition) throw new Error(label);
};
const authClient = () => createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function login(email, password) {
  const client = authClient();
  const data = must(await client.auth.signInWithPassword({ email, password }), `password login ${email}`);
  assert(data.session && data.user, `password login returned no session for ${email}`);
  return { client, session: data.session, user: data.user };
}

const coach = await login(coachEmail, coachPassword);
const client = await login(clientEmail, clientPassword);
const coachProfile = must(await coach.client.from("profiles").select("id,role,status,is_test_account").eq("id", coach.user.id).single(), "coach profile");
const clientProfile = must(await client.client.from("profiles").select("id,role,status,is_test_account").eq("id", client.user.id).single(), "client profile");
assert(coachProfile.role === "coach" && coachProfile.status === "active" && coachProfile.is_test_account, "coach test marker invalid");
assert(clientProfile.role === "client" && clientProfile.status === "active" && clientProfile.is_test_account, "client test marker invalid");

const coachVisibleProfiles = must(await coach.client.from("profiles").select("id,is_test_account"), "coach profile visibility");
assert(coachVisibleProfiles.some((profile) => profile.id === client.user.id), "test coach cannot see assigned test client");
assert(coachVisibleProfiles.every((profile) => profile.is_test_account), "test coach can see a real profile");
const clientVisibleProfiles = must(await client.client.from("profiles").select("id"), "client profile visibility");
assert(clientVisibleProfiles.length === 1 && clientVisibleProfiles[0].id === client.user.id, "test client can see another profile");

const coachMasterMenus = must(
  await coach.client
    .from("meal_plans")
    .select("id,coach_id,is_system_template")
    .eq("is_system_template", true),
  "coach master menu visibility",
);
assert(
  coachMasterMenus.length === 1 &&
    coachMasterMenus[0].coach_id === coach.user.id,
  "test coach cannot see exactly its own master menu",
);
const clientMasterMenus = must(
  await client.client
    .from("meal_plans")
    .select("id")
    .eq("is_system_template", true),
  "client master menu isolation",
);
assert(clientMasterMenus.length === 0, "test client can see a coach master menu");
const clientAssignedMenus = must(
  await client.client
    .from("meal_plans")
    .select("id,title,calorie_target,protein_target,carbohydrate_target,fat_target")
    .eq("title", "תפריט מאסטר START — עותק"),
  "client assigned menu visibility",
);
assert(
  clientAssignedMenus.length === 1 &&
    clientAssignedMenus[0].calorie_target === 2200 &&
    clientAssignedMenus[0].protein_target === 144 &&
    clientAssignedMenus[0].carbohydrate_target === 269 &&
    clientAssignedMenus[0].fat_target === 61,
  "test client cannot read the saved assigned menu and macro targets",
);
const clientMeals = must(
  await client.client
    .from("meals")
    .select("id,meal_plan_id")
    .eq("meal_plan_id", clientAssignedMenus[0].id),
  "client assigned meals visibility",
);
assert(clientMeals.length === 4, "test client cannot read all assigned meals");
const clientUsage = must(
  await client.client.from("coach_food_usage").select("food_id"),
  "client coach-food usage isolation",
);
assert(clientUsage.length === 0, "test client can see coach food usage");
const clientUsageMutation = await client.client.rpc("record_coach_food_selection", {
  p_food_id: "1",
});
assert(Boolean(clientUsageMutation.error), "test client can record coach food usage");

if (realClientId) {
  const coachRealCheckIns = must(await coach.client.from("check_ins").select("id").eq("client_id", realClientId), "coach real check-in guard");
  const clientRealCheckIns = must(await client.client.from("check_ins").select("id").eq("client_id", realClientId), "client real check-in guard");
  const clientRealPhotos = must(await client.client.from("check_in_photos").select("id").eq("client_id", realClientId), "client real photo guard");
  assert(coachRealCheckIns.length === 0 && clientRealCheckIns.length === 0 && clientRealPhotos.length === 0, "test account crossed into real client data");
}

const deviceA = `e2e-client-a-${client.user.id}`;
const deviceB = `e2e-client-b-${client.user.id}`;
must(await client.client.rpc("activate_current_device", { p_device_id: deviceA, p_device_name: "E2E A" }), "activate client device A");
must(await client.client.rpc("activate_current_device", { p_device_id: deviceB, p_device_name: "E2E B" }), "activate client device B");
const activeDevices = must(
  await client.client
    .from("device_sessions")
    .select("device_id,revoked_at")
    .eq("user_id", client.user.id)
    .is("revoked_at", null),
  "active client device sessions",
);
assert(
  activeDevices.length === 1 && activeDevices[0].device_id === deviceB,
  "single-device enforcement did not revoke the replaced client device",
);

must(await client.client.auth.signOut({ scope: "local" }), "test client logout");
const relogin = await login(clientEmail, clientPassword);
must(await relogin.client.rpc("activate_current_device", { p_device_id: deviceB, p_device_name: "E2E B" }), "activate re-login device");
const reloginProfile = must(
  await relogin.client.from("profiles").select("id,role,is_test_account").eq("id", relogin.user.id).single(),
  "fixed test client re-login",
);
assert(
  reloginProfile.id === client.user.id && reloginProfile.role === "client" && reloginProfile.is_test_account,
  "fixed test client re-login returned the wrong identity",
);

console.log(JSON.stringify({
  passwordLogin: true,
  testMarkers: true,
  isolatedRelationship: true,
  realDataBlocked: Boolean(realClientId),
  roleIsolation: true,
  masterMenuIsolation: true,
  assignedMenuVisibility: true,
  coachFoodUsageIsolation: true,
  singleClientDevice: true,
  logoutAndRelogin: true,
  passwordsPrinted: false,
}, null, 2));
