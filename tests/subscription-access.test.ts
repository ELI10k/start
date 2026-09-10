import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { entitlementFor, hasEntitlement, parseSubscriptionAccess, requiresCoachAssignment, subscriptionAccessForPlan, type SubscriptionAccess } from "../lib/subscriptions/access.ts";

const access: SubscriptionAccess = {
  plan: "coach", status: "active", source: "legacy",
  entitlements: { coach_messaging: { enabled: true, limit: null }, technique_review: { enabled: true, limit: 2 } },
  overrides: {},
};

test("plan capabilities fail closed and overrides win", () => {
  assert.equal(hasEntitlement(access, "coach_messaging"), true);
  assert.equal(hasEntitlement(access, "video_calls"), false);
  assert.equal(entitlementFor({ ...access, overrides: { technique_review: { enabled: false, limit: 0 } } }, "technique_review").enabled, false);
});

test("human service also requires an active coach assignment", () => {
  assert.equal(requiresCoachAssignment("coach_messaging"), true);
  assert.equal(requiresCoachAssignment("weekly_adaptation"), false);
});

test("the three product tiers expose increasing human service", () => {
  const digital = subscriptionAccessForPlan("digital");
  const coach = subscriptionAccessForPlan("coach");
  const vip = subscriptionAccessForPlan("vip");
  assert.equal(hasEntitlement(digital, "coach_messaging"), false);
  assert.equal(hasEntitlement(coach, "coach_messaging"), true);
  assert.equal(entitlementFor(coach, "technique_review").limit, 2);
  assert.equal(entitlementFor(vip, "video_calls").limit, 1);
});

test("messages are gated in both the page and the server action", async () => {
  const [page, action, shell] = await Promise.all([
    readFile(new URL("../app/messages/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/messages.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/client/ClientShell.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [page, action, shell]) assert.match(source, /hasEntitlement\([^)]*,\s*"coach_messaging"\)/);
  assert.match(action, /getSubscriptionAccess\(clientId\)/);
});

test("database access is parsed defensively and unknown capabilities are dropped", () => {
  const parsed = parseSubscriptionAccess({
    plan: "digital", status: "active", source: "web",
    entitlements: { start_iq: { enabled: true, limit: null }, invented: { enabled: true, limit: 99 } },
    overrides: { technique_review: { enabled: true, limit: -3 } },
  });
  assert.equal(parsed.plan, "digital");
  assert.equal(parsed.entitlements.start_iq?.enabled, true);
  assert.equal("invented" in parsed.entitlements, false);
  assert.equal(parsed.overrides.technique_review?.limit, null);
  assert.equal(parseSubscriptionAccess(null).plan, null);
});

test("subscription migration is charge-safe, RLS protected and grandfathered", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609010002_subscription_plans_and_entitlements.sql", import.meta.url), "utf8");
  for (const table of ["subscription_plans", "plan_entitlements", "subscriptions", "entitlement_overrides", "entitlement_usage"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /'digital','START Digital',9700/);
  assert.match(sql, /'active','legacy',now\(\)/);
  assert.match(sql, /source = 'legacy' or provider_subscription_id is not null/);
  assert.match(sql, /insert into public\.subscriptions\(user_id,plan_code,status,source,current_period_start\)\s*select/is);
  assert.doesNotMatch(sql, /insert into public\.subscriptions\(user_id,plan_code,status,source,current_period_start,provider_customer_id/is);
  assert.match(sql, /p_user_id=auth\.uid\(\) or public\.is_coach_for\(p_user_id\)/);
  assert.match(sql, /revoke all on public\.subscription_plans/);
  assert.match(sql, /on conflict\(user_id,capability,period_start\) do update/);
  assert.match(sql, /public\.entitlement_usage\.used_count\+excluded\.used_count<=v_limit/);
  assert.match(sql, /create or replace function public\.submit_technique_video/);
  assert.match(sql, /revoke insert on public\.exercise_technique_videos from authenticated/);
  assert.match(sql, /create table public\.checkout_sessions/);
  assert.match(sql, /create table public\.billing_events/);
  assert.match(sql, /auth\.role\(\)<>'service_role'/);
  assert.match(sql, /on conflict\(source,provider_subscription_id\)/);
  assert.match(sql, /v_user_id<>v_checkout\.user_id/);
  assert.match(sql, /create or replace function public\.grant_coached_client_subscription/);
  assert.match(sql, /values\(p_client_id,'coach','active','manual',now\(\)\)/);
});

test("technique videos and human check-in reviews are server enforced", async () => {
  const [button, actions] = await Promise.all([
    readFile(new URL("../components/workouts/client/TechniqueVideoButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/product.ts", import.meta.url), "utf8"),
  ]);
  assert.match(button, /rpc\("submit_technique_video"/);
  assert.doesNotMatch(button, /from\("exercise_technique_videos"\)\.insert/);
  assert.match(button, /hasEntitlement\(access,"technique_review"\)/);
  assert.match(actions, /"human_checkin_review"/);
});

test("self-service onboarding computes targets and lands on a useful first action", async () => {
  const [action, completion] = await Promise.all([
    readFile(new URL("../app/actions/onboarding.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/onboarding/complete/page.tsx", import.meta.url), "utf8"),
  ]);
  const block = action.slice(action.indexOf("export async function completeClientOnboarding"));
  assert.match(block, /calculateEnergy\(/);
  assert.match(block, /calculateMacroTargetResult\(/);
  assert.match(block, /calorie_target:energy\.calorieTarget/);
  assert.match(block, /protein_target:macros\.targets\.protein/);
  assert.match(block, /redirect\("\/onboarding\/complete"\)/);
  assert.match(await readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"), /clientProfile\?\.onboarding_completed/);
  assert.match(completion, /הפעולה הראשונה שלך/);
  assert.match(completion, /href="\/workouts"/);
});

test("checkout uses an opaque reference and billing events require a signed idempotent bridge", async () => {
  const [checkout, webhook, billingReturn, billingConfig] = await Promise.all([
    readFile(new URL("../app/actions/subscriptions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/billing/return/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/billing/config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(checkout, /checkout_sessions/);
  assert.match(checkout, /client_reference_id/);
  assert.doesNotMatch(checkout, /searchParams\.set\([^,]+,auth\.id/);
  assert.match(checkout, /eq\("status","pending"\)/);
  assert.match(checkout, /billing\.mode==="manual"/);
  assert.match(billingConfig, /NEXT_PUBLIC_CHECKOUT_URL/);
  assert.match(billingConfig, /secure\.cardcom\.solutions\/EA\/EA5\/QAAh9r21UehUv2rz5tL0A\/PaymentSP/);
  assert.match(billingConfig, /BILLING_WEBHOOK_ENABLED === "true"/);
  assert.match(webhook, /createHmac\("sha256"/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(webhook, /MAX_BODY_BYTES/);
  assert.match(webhook, /apply_billing_event/);
  assert.match(billingReturn, /getSubscriptionAccess/);
  assert.doesNotMatch(billingReturn, /searchParams/);
  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /"\/billing"/);
});

test("public Digital acquisition verifies identity, payment and onboarding in that order", async () => {
  const [join, accept, callback, acceptLink, proxy, billingStart] = await Promise.all([
    readFile(new URL("../app/join/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/accept-invite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/accept-link/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/billing/start/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(join, /digital_join_email/);
  assert.match(join, /digital_join_ip/);
  assert.match(join, /signInWithOtp/);
  assert.match(join, /shouldCreateUser: false/);
  assert.match(join, /auth\/confirm-link/);
  assert.match(join, /role: "client", acquisition: "self_service"/);
  assert.match(join, /אם הכתובת מתאימה להרשמה/);
  assert.doesNotMatch(join, /provider_customer_id/);
  assert.match(accept, /!subscriptionError&&!paidPlan/);
  assert.match(accept, /redirect\("\/billing\/start"\)/);
  assert.match(callback, /!relationship&&!subscriptionError&&!paidPlan/);
  assert.match(acceptLink, /!relationship&&!subscriptionError&&!paidPlan/);
  assert.match(proxy, /!relationship && !subscriptionError && !paidPlan/);
  assert.match(proxy, /path !== "\/onboarding"/);
  assert.match(billingStart, /if \(access\.plan\) redirect\("\/"\)/);
  assert.match(billingStart, /startDigitalCheckout/);
  const onboardingAction = await readFile(new URL("../app/actions/onboarding.ts", import.meta.url), "utf8");
  assert.match(onboardingAction, /grant_coached_client_subscription/);
});
