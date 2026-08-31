import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://start-snowy-eight.vercel.app").replace(/\/$/, "");

if (!url || !anonKey || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY locally.");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const suffix = randomUUID();
const coachEmail = `start-auth-coach-${suffix}@example.com`;
const clientEmail = `start-auth-client-${suffix}@example.com`;
const today = new Date().toISOString().slice(0, 10);
const ids = {
  coach: undefined,
  client: undefined,
  mealPlan: undefined,
  content: undefined,
  workoutAssignment: undefined,
  workoutSession: undefined,
};
const result = {
  loginMethod: "magic_link",
  profilesAndRoles: false,
  coachClientIsolation: false,
  sessionRefresh: false,
  logoutAndRelogin: false,
  singleClientDevice: false,
  coachMultipleDevices: false,
  nutritionAfterRelogin: false,
  workoutsAfterRelogin: false,
  contentAfterRelogin: false,
  checkInsAndProgressRls: false,
  productionRoutes: false,
  temporaryUsersDeleted: false,
};
let failure;

function must(response, label) {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data;
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
}

function userClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function magicLinkSession(email) {
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  const link = must(generated, "generate magic link");
  const client = userClient();
  const verified = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  const auth = must(verified, "verify magic link");
  assert(auth.session, "magic link did not create a session");
  return { client, session: auth.session };
}

async function authCookieHeader(session, deviceId) {
  const jar = new Map();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  must(
    await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
    "serialize auth session",
  );
  if (deviceId) jar.set("start-device-id", deviceId);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function productionRequest(path, cookie, init = {}) {
  return fetch(`${siteUrl}${path}`, {
    ...init,
    redirect: "manual",
    headers: { ...init.headers, ...(cookie ? { cookie } : {}) },
  });
}

function redirectPath(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, siteUrl).pathname + new URL(location, siteUrl).search : "";
}

async function removeRows(table, column, value) {
  if (!value) return;
  await admin.from(table).delete().eq(column, value);
}

try {
  const createdCoach = must(
    await admin.auth.admin.createUser({
      email: coachEmail,
      email_confirm: true,
      app_metadata: { role: "coach", full_name: "START Auth Coach" },
      user_metadata: { full_name: "START Auth Coach" },
    }),
    "create coach",
  );
  ids.coach = createdCoach.user.id;

  const createdClient = must(
    await admin.auth.admin.createUser({
      email: clientEmail,
      email_confirm: true,
      app_metadata: { role: "client", full_name: "START Auth Client" },
      user_metadata: { full_name: "START Auth Client" },
    }),
    "create client",
  );
  ids.client = createdClient.user.id;

  const provisioned = must(
    await admin.from("profiles").select("id,role,status").in("id", [ids.coach, ids.client]),
    "read provisioned profiles",
  );
  const roles = must(
    await admin.from("user_roles").select("user_id,role").in("user_id", [ids.coach, ids.client]),
    "read provisioned roles",
  );
  assert(provisioned.length === 2 && provisioned.every((row) => row.status === "active"), "profiles were not provisioned active");
  assert(roles.some((row) => row.user_id === ids.coach && row.role === "coach"), "coach role missing");
  assert(roles.some((row) => row.user_id === ids.client && row.role === "client"), "client role missing");
  result.profilesAndRoles = true;

  const coachLogin = await magicLinkSession(coachEmail);
  const clientDeviceOne = await magicLinkSession(clientEmail);
  const clientDeviceTwo = await magicLinkSession(clientEmail);

  const beforeRelationship = must(
    await coachLogin.client.from("profiles").select("id").eq("id", ids.client),
    "coach isolation before relationship",
  );
  assert(beforeRelationship.length === 0, "coach saw an unassigned client");

  must(
    await admin.from("coach_client_relationships").insert({
      coach_id: ids.coach,
      client_id: ids.client,
      status: "active",
    }),
    "link coach and client",
  );

  const coachProfiles = must(await coachLogin.client.from("profiles").select("id"), "coach profile visibility");
  const clientProfiles = must(await clientDeviceOne.client.from("profiles").select("id"), "client profile visibility");
  assert(coachProfiles.some((row) => row.id === ids.client), "coach cannot see assigned client");
  assert(!clientProfiles.some((row) => row.id === ids.coach), "client can see coach profile");
  const forbiddenRelationship = await clientDeviceOne.client.from("coach_client_relationships").insert({
    coach_id: ids.coach,
    client_id: ids.client,
    status: "active",
  });
  assert(forbiddenRelationship.error, "client could mutate coach relationship");
  result.coachClientIsolation = true;

  const coachDeviceOne = `coach-a-${suffix}`;
  const coachDeviceTwo = `coach-b-${suffix}`;
  must(await coachLogin.client.rpc("activate_current_device", { p_device_id: coachDeviceOne, p_device_name: "Coach A" }), "activate coach device A");
  must(await coachLogin.client.rpc("activate_current_device", { p_device_id: coachDeviceTwo, p_device_name: "Coach B" }), "activate coach device B");
  const activeCoachDevices = must(
    await coachLogin.client.from("device_sessions").select("device_id").is("revoked_at", null),
    "read coach devices",
  );
  assert(activeCoachDevices.length === 2, "coach devices were incorrectly restricted");
  result.coachMultipleDevices = true;

  const oldClientDevice = `client-a-${suffix}`;
  const activeClientDevice = `client-b-${suffix}`;
  must(await clientDeviceOne.client.rpc("activate_current_device", { p_device_id: oldClientDevice, p_device_name: "Client A" }), "activate client device A");
  must(await clientDeviceTwo.client.rpc("activate_current_device", { p_device_id: activeClientDevice, p_device_name: "Client B" }), "activate client device B");
  const activeClientDevices = must(
    await clientDeviceTwo.client.from("device_sessions").select("device_id").is("revoked_at", null),
    "read client devices",
  );
  assert(activeClientDevices.length === 1 && activeClientDevices[0].device_id === activeClientDevice, "client has more than one active device");

  const oldCookie = await authCookieHeader(clientDeviceOne.session, oldClientDevice);
  const replacedResponse = await productionRequest("/nutrition", oldCookie);
  const replacedPath = redirectPath(replacedResponse);
  assert(
    replacedResponse.status >= 300 &&
      replacedResponse.status < 400 &&
      replacedPath.includes("reason=replaced") &&
      (replacedPath.startsWith("/login") || replacedPath.startsWith("/unauthorized")),
    "replaced client device was not blocked in production",
  );

  const refreshed = must(await clientDeviceTwo.client.auth.refreshSession(), "refresh client session");
  assert(refreshed.session, "session refresh returned no session");
  clientDeviceTwo.session = refreshed.session;
  const activeCookie = await authCookieHeader(clientDeviceTwo.session, activeClientDevice);
  const refreshedResponse = await productionRequest("/nutrition", activeCookie);
  assert(refreshedResponse.status === 200, "refreshed client session cannot access production");
  result.sessionRefresh = true;
  result.singleClientDevice = true;

  const coachCookie = await authCookieHeader(coachLogin.session);
  const coachAllowed = await productionRequest("/coach", coachCookie);
  const coachDenied = await productionRequest("/nutrition", coachCookie);
  const clientAllowed = await productionRequest("/nutrition", activeCookie);
  const clientDenied = await productionRequest("/coach", activeCookie);
  assert(coachAllowed.status === 200 && clientAllowed.status === 200, "authorized production route failed");
  assert(redirectPath(coachDenied) === "/unauthorized" && redirectPath(clientDenied) === "/unauthorized", "role route guard failed");

  const logoutResponse = await productionRequest("/auth/logout", activeCookie, { method: "POST" });
  assert(logoutResponse.status === 303 && redirectPath(logoutResponse) === "/login", "production logout failed");
  assert((logoutResponse.headers.get("set-cookie") || "").includes("sb-"), "logout did not clear auth cookies");
  const loggedOutResponse = await productionRequest("/nutrition", "");
  assert(redirectPath(loggedOutResponse).startsWith("/login"), "logged-out request was not rejected");

  const relogin = await magicLinkSession(clientEmail);
  must(await relogin.client.rpc("activate_current_device", { p_device_id: activeClientDevice, p_device_name: "Client B" }), "activate device after re-login");
  const reloginCookie = await authCookieHeader(relogin.session, activeClientDevice);
  assert((await productionRequest("/nutrition", reloginCookie)).status === 200, "client re-login failed in production");
  result.logoutAndRelogin = true;

  const food = must(await coachLogin.client.from("foods").select("id").limit(1).single(), "read food for nutrition test");
  const savedPlan = must(
    await coachLogin.client.rpc("save_meal_plan_tree", {
      p_plan: {
        title: `Auth E2E ${suffix}`,
        description: "temporary production auth verification",
        clientId: ids.client,
        status: "active",
        calorieTarget: "2000",
        proteinTarget: "140",
        carbohydrateTarget: "220",
        fatTarget: "60",
        activeFrom: today,
        activeUntil: "",
        days: [{ dayIndex: 0, meals: [{ title: "ארוחת בוקר", groups: [{ type: "protein", items: [{ foodId: food.id, amount: "100", itemRole: "primary", sortOrder: 0 }] }] }] }],
      },
    }),
    "save assigned meal plan",
  );
  ids.mealPlan = savedPlan;
  const testMeal = must(await relogin.client.from("meals").select("id").eq("meal_plan_id", ids.mealPlan).single(), "load assigned meal");
  const testMealItem = must(await relogin.client.from("meal_items").select("id").eq("meal_id", testMeal.id).single(), "load assigned meal item");
  must(await relogin.client.rpc("set_meal_item_eaten", { p_meal_item_id: testMealItem.id, p_date: today, p_eaten: true }), "mark meal item eaten");

  const program = must(
    await coachLogin.client.from("workout_programs").select("id").eq("official", true).eq("status", "active").limit(1).single(),
    "read official workout program",
  );
  const day = must(await coachLogin.client.from("workout_program_days").select("id").eq("program_id", program.id).order("sort_order").limit(1).single(), "read workout day");
  const exercise = must(await coachLogin.client.from("workout_program_exercises").select("id,exercise_id").eq("day_id", day.id).order("sort_order").limit(1).single(), "read workout exercise");
  const prescriptionRows = must(await coachLogin.client.from("workout_set_prescriptions").select("id").eq("program_exercise_id", exercise.id).order("sort_order").limit(1), "read workout prescription");
  ids.workoutAssignment = must(
    await coachLogin.client.rpc("assign_workout_program", {
      p_program_id: program.id,
      p_client_id: ids.client,
      p_start_date: today,
      p_end_date: null,
      p_weekly_frequency: 3,
      p_coach_note: "temporary auth verification",
    }),
    "assign workout program",
  );
  ids.workoutSession = `session-auth-${suffix}`;
  const startedAt = new Date().toISOString();
  const workoutResult = [{
    workoutExerciseId: exercise.id,
    exerciseId: exercise.exercise_id,
    skipped: false,
    completed: true,
    sets: [{
      id: `set-auth-${suffix}`,
      prescriptionId: prescriptionRows[0]?.id || "",
      order: 0,
      weightKg: "42.5",
      repetitions: "8",
      notes: "",
      completed: true,
      completedAt: startedAt,
    }],
  }];
  must(
    await relogin.client.rpc("save_active_workout", {
      p_session: {
        id: ids.workoutSession,
        assignmentId: ids.workoutAssignment,
        programId: program.id,
        dayId: day.id,
        startedAt,
        currentExerciseIndex: 0,
        exerciseResults: workoutResult,
      },
    }),
    "save active workout",
  );

  const category = must(await coachLogin.client.from("content_categories").select("id").eq("active", true).order("sort_order").limit(1).single(), "read content category");
  ids.content = must(
    await coachLogin.client.rpc("save_content_item", {
      p_item: {
        title: `Auth E2E ${suffix}`,
        description: "temporary production auth verification",
        categoryId: category.id,
        status: "published",
        contentType: "article",
        body: "Temporary content used only to verify authenticated persistence.",
        tags: [],
        estimatedMinutes: "1",
        sortOrder: "999",
      },
    }),
    "publish content",
  );
  must(await relogin.client.rpc("record_content_view", { p_content_item_id: ids.content }), "record content view");
  must(await relogin.client.rpc("save_content_progress", { p_content_item_id: ids.content, p_progress_percent: 73, p_last_position_seconds: 45 }), "save content progress");
  must(await relogin.client.rpc("set_content_favorite", { p_content_item_id: ids.content, p_favorite: true }), "save content favorite");

  must(
    await relogin.client.from("progress_entries").insert({ client_id: ids.client, date: today, weight: 81.2, waist: 88.4 }),
    "save progress entry",
  );
  must(
    await relogin.client.from("check_ins").insert({ client_id: ids.client, adherence: 4, hunger: 3, energy: 4, sleep: 4, training: true, notes: "temporary auth verification" }),
    "save check-in",
  );

  const afterSaveLogin = await magicLinkSession(clientEmail);
  must(await afterSaveLogin.client.rpc("activate_current_device", { p_device_id: activeClientDevice, p_device_name: "Client B" }), "activate device after persistence re-login");

  const eaten = must(
    await afterSaveLogin.client.from("eaten_meal_items").select("id").eq("meal_item_id", testMealItem.id),
    "reload eaten meal item",
  );
  assert(eaten.length === 1, "nutrition item did not persist after re-login");
  result.nutritionAfterRelogin = true;

  const activeWorkout = must(
    await afterSaveLogin.client.from("workout_sessions").select("id,status").eq("id", ids.workoutSession).single(),
    "reload active workout",
  );
  assert(activeWorkout.status === "active", "active workout did not persist after re-login");
  const completedAt = new Date().toISOString();
  const completionId = `workout-${ids.workoutSession}`;
  must(
    await afterSaveLogin.client.rpc("complete_workout", {
      p_workout: {
        id: completionId,
        assignmentId: ids.workoutAssignment,
        programId: program.id,
        dayId: day.id,
        startedAt,
        completedAt,
        durationSeconds: 60,
        exerciseResults: workoutResult,
        perceivedDifficulty: 3,
        energy: 4,
        totalVolume: 340,
      },
    }),
    "complete workout",
  );
  const workoutHistory = must(
    await afterSaveLogin.client.from("workout_sessions").select("status,completion_id").eq("id", ids.workoutSession).single(),
    "reload workout history",
  );
  const workoutSets = must(
    await afterSaveLogin.client.from("workout_sets").select("weight_kg,repetitions").eq("session_id", ids.workoutSession),
    "reload workout sets",
  );
  assert(workoutHistory.status === "completed" && workoutHistory.completion_id === completionId, "workout history was not completed");
  assert(Number(workoutSets[0]?.weight_kg) === 42.5 && workoutSets[0]?.repetitions === 8, "workout set values did not persist");
  result.workoutsAfterRelogin = true;

  const contentProgress = must(
    await afterSaveLogin.client.from("content_progress").select("progress_percent,last_position_seconds").eq("content_item_id", ids.content).single(),
    "reload content progress",
  );
  const contentFavorite = must(
    await afterSaveLogin.client.from("content_favorites").select("content_item_id").eq("content_item_id", ids.content),
    "reload content favorite",
  );
  assert(contentProgress.progress_percent === 73 && contentProgress.last_position_seconds === 45, "content progress did not persist");
  assert(contentFavorite.length === 1, "content favorite did not persist");
  result.contentAfterRelogin = true;

  const coachProgress = must(await coachLogin.client.from("progress_entries").select("client_id").eq("client_id", ids.client).eq("date", today), "coach reads assigned progress");
  const coachCheckIns = must(await coachLogin.client.from("check_ins").select("client_id").eq("client_id", ids.client).eq("notes", "temporary auth verification"), "coach reads assigned check-in");
  assert(coachProgress.length === 1 && coachCheckIns.length === 1, "coach cannot read assigned progress/check-in");
  result.checkInsAndProgressRls = true;

  const afterSaveCookie = await authCookieHeader(afterSaveLogin.session, activeClientDevice);
  const productionPages = await Promise.all([
    productionRequest("/nutrition", afterSaveCookie),
    productionRequest("/workouts", afterSaveCookie),
    productionRequest("/content", afterSaveCookie),
    productionRequest("/coach/workouts", coachCookie),
    productionRequest("/coach/content", coachCookie),
  ]);
  assert(productionPages.every((response) => response.status === 200), "authenticated module page failed in production");
  result.productionRoutes = true;
} catch (error) {
  failure = error instanceof Error ? error.message : "unknown verification failure";
} finally {
  // A failed run may stop before individual generated ids are captured. Remove
  // everything owned by the two temporary principals before deleting Auth.
  if (ids.coach || ids.client) {
    const principals = [ids.coach, ids.client].filter(Boolean);
    await admin.from("client_content_assignments").delete().in("assigned_by", principals);
    await admin.from("client_meal_plan_assignments").delete().in("assigned_by", principals);
    await admin.from("workout_assignments").delete().in("assigned_by", principals);
    await admin.from("meal_plans").delete().in("coach_id", principals);
    await admin.from("menus").delete().in("coach_id", principals);
    await admin.from("workout_programs").delete().in("coach_id", principals);
  }
  await removeRows("content_favorites", "client_id", ids.client);
  await removeRows("content_progress", "client_id", ids.client);
  await removeRows("content_items", "id", ids.content);
  await removeRows("nutrition_logs", "client_id", ids.client);
  await removeRows("client_meal_plan_assignments", "client_id", ids.client);
  await removeRows("meal_plans", "id", ids.mealPlan);
  await removeRows("workout_notifications", "client_id", ids.client);
  await removeRows("workout_sets", "session_id", ids.workoutSession);
  await removeRows("workout_session_exercises", "session_id", ids.workoutSession);
  await removeRows("workout_sessions", "client_id", ids.client);
  await removeRows("workout_assignments", "client_id", ids.client);
  await removeRows("check_ins", "client_id", ids.client);
  await removeRows("progress_entries", "client_id", ids.client);
  await removeRows("device_sessions", "user_id", ids.client);
  await removeRows("device_sessions", "user_id", ids.coach);
  await removeRows("coach_client_relationships", "client_id", ids.client);

  if (ids.client) await admin.auth.admin.deleteUser(ids.client);
  if (ids.coach) await admin.auth.admin.deleteUser(ids.coach);

  if (ids.client && ids.coach) {
    const remaining = must(
      await admin.from("profiles").select("id").in("id", [ids.client, ids.coach]),
      "verify temporary user cleanup",
    );
    result.temporaryUsersDeleted = remaining.length === 0;
  }
}

console.log(JSON.stringify({ ...result, failure: failure || null }, null, 2));
if (failure || !Object.values(result).every(Boolean)) process.exitCode = 1;
