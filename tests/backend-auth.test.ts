import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { activateDevice, isActiveDevice } from "../lib/auth/device.ts";
import { canAccessPath, canCoachAccessClient, destinationForRole } from "../lib/auth/authorization.ts";
import { getE2ETestEmails, isAllowedE2ETestEmail, isE2ETestLoginEnabled } from "../lib/auth/test-login.ts";

test("role authorization sends each role to its own product area",()=>{assert.equal(destinationForRole("coach"),"/coach");assert.equal(destinationForRole("client"),"/");assert.equal(canAccessPath("coach","/coach/clients"),true);assert.equal(canAccessPath("coach","/nutrition"),false);assert.equal(canAccessPath("client","/coach"),false);assert.equal(canAccessPath("client","/progress"),true)});
test("coach access requires an active direct relationship",()=>{const rows=[{coachId:"c1",clientId:"u1",status:"active"},{coachId:"c1",clientId:"u2",status:"ended"}];assert.equal(canCoachAccessClient(rows,"c1","u1"),true);assert.equal(canCoachAccessClient(rows,"c1","u2"),false);assert.equal(canCoachAccessClient(rows,"c2","u1"),false)});
test("activating a client device revokes the previous device",()=>{const next=activateDevice([{deviceId:"old-device-123456",revokedAt:undefined}],{deviceId:"new-device-123456",revokedAt:undefined},"client","2026-07-20T00:00:00Z");assert.equal(isActiveDevice(next,"old-device-123456"),false);assert.equal(isActiveDevice(next,"new-device-123456"),true)});
test("coach devices remain concurrently active",()=>{const next=activateDevice([{deviceId:"coach-device-one",revokedAt:undefined}],{deviceId:"coach-device-two",revokedAt:undefined},"coach","2026-07-20T00:00:00Z");assert.equal(isActiveDevice(next,"coach-device-one"),true);assert.equal(isActiveDevice(next,"coach-device-two"),true)});
test("migration enables RLS and contains isolation policies for sensitive entities",async()=>{const sql=await readFile(new URL("../supabase/migrations/202607200001_initial_product.sql",import.meta.url),"utf8");for(const table of ["profiles","menus","meal_completion_logs","progress_entries","check_ins","device_sessions"])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));for(const policy of ["menus_client_select","progress_self_all","progress_coach_select","check_ins_self_insert","check_ins_coach_select","content_published_read"])assert.match(sql,new RegExp(`create policy ${policy}`));assert.match(sql,/profile_authority_fields_are_server_managed|profiles_self_update/)});

test("auth migration provisions trusted roles and enforces one client device",async()=>{const sql=await readFile(new URL("../supabase/migrations/202607200010_auth_roles_and_devices.sql",import.meta.url),"utf8");for(const rule of ["create table public.user_roles","handle_new_auth_user","raw_app_meta_data","relationships_validate_roles","user_roles_self_select","device_sessions_one_enforced_active_idx","pg_advisory_xact_lock","deactivate_current_device"])assert.match(sql,new RegExp(rule));assert.match(sql,/if user_role = 'client' then[\s\S]*revoked_at = now\(\)/);assert.match(sql,/user_role = 'client'\)/);assert.match(sql,/revoke all on table public\.profiles/)});

test("magic-link login cannot self-register and server guards protect client pages",async()=>{const [action,proxy,routeClient,callback,logout,profile,preferences,support,layout]=await Promise.all([readFile(new URL("../app/login/actions.ts",import.meta.url),"utf8"),readFile(new URL("../proxy.ts",import.meta.url),"utf8"),readFile(new URL("../lib/supabase/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/auth/callback/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/auth/logout/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/profile/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/preferences/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/support/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/layout.tsx",import.meta.url),"utf8")]);assert.match(action,/signInWithOtp/);assert.match(action,/shouldCreateUser:\s*false/);for(const source of [proxy,routeClient]){assert.match(source,/apply.*AuthState/);assert.match(source,/Cache-Control/)}assert.match(callback,/exchangeCodeForSession/);assert.match(callback,/activate_current_device/);assert.match(logout,/deactivate_current_device/);for(const source of [proxy,callback,logout])assert.match(source,/signOut\(\{ scope: "local" \}\)/);for(const page of [profile,preferences,support]){assert.match(page,/getAuthContext/);assert.match(page,/auth\.role !== "client"/)}assert.match(profile,/action="\/auth\/logout"/);assert.match(profile,/התנתקות מהחשבון/);assert.match(layout,/AuthSessionWatcher/)});
test("invite acceptance defers OTP verification until an explicit confirmation and stores invitation history",async()=>{const [migration,confirmation,acceptance,onboarding,login,coachClient]=await Promise.all([readFile(new URL("../supabase/migrations/202607270006_client_invitation_history.sql",import.meta.url),"utf8"),readFile(new URL("../app/auth/confirm-invite/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/auth/accept-invite/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/actions/onboarding.ts",import.meta.url),"utf8"),readFile(new URL("../app/login/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/coach/clients/[id]/page.tsx",import.meta.url),"utf8")]);assert.match(migration,/create table public\.client_invitations/);assert.match(migration,/security_invoker = true/);assert.match(migration,/client_invitations_coach_read/);assert.match(confirmation,/action="\/auth\/accept-invite"/);assert.match(acceptance,/verifyOtp\(\{token_hash:tokenHash,type:"invite"\}\)/);assert.match(acceptance,/verification\.session/);assert.match(acceptance,/auth\.setSession/);assert.match(acceptance,/activate_current_device/);assert.match(onboarding,/resendClientInvite/);assert.match(onboarding,/status:"superseded"/);assert.match(onboarding,/onboarding_completed/);assert.match(login,/הקישור אינו תקף או שפג תוקפו/);assert.match(coachClient,/סטטוס הזמנה/);assert.match(coachClient,/שלח הזמנה מחדש/) });

test("coach client creation handles duplicate emails in the form and prevents duplicate submits",async()=>{const[action,form,page]=await Promise.all([readFile(new URL("../app/actions/onboarding.ts",import.meta.url),"utf8"),readFile(new URL("../components/coach/CreateClientForm.tsx",import.meta.url),"utf8"),readFile(new URL("../app/coach/clients/new/page.tsx",import.meta.url),"utf8")]);assert.match(action,/duplicate_client_email/);assert.match(action,/כבר קיים חשבון עם כתובת האימייל הזו/);assert.match(action,/return \{status:"error",message:createClientErrorMessage\(error\)\}/);assert.match(form,/useActionState\(createClientFromCoach,initialState\)/);assert.match(form,/role="alert"/);assert.match(form,/disabled=\{pending\}/);assert.match(page,/<CreateClientForm\/>/) });
test("magic links are also confirmed by an explicit user action before OTP verification",async()=>{const [confirmation,acceptance,onboarding,config]=await Promise.all([readFile(new URL("../app/auth/confirm-link/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/auth/accept-link/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/actions/onboarding.ts",import.meta.url),"utf8"),readFile(new URL("../supabase/config.toml",import.meta.url),"utf8")]);assert.match(confirmation,/action="\/auth\/accept-link"/);assert.match(acceptance,/verifyOtp\(\{ token_hash: tokenHash, type: "magiclink" \}\)/);assert.match(acceptance,/activate_current_device/);assert.match(onboarding,/auth\/confirm-link/);assert.match(config,/auth\.email\.template\.magic_link/) });
test("coached clients bypass self-service onboarding while independent clients retain it",async()=>{const [invite,link,callback,onboarding,proxy]=await Promise.all([readFile(new URL("../app/auth/accept-invite/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/auth/accept-link/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/auth/callback/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/onboarding/page.tsx",import.meta.url),"utf8"),readFile(new URL("../proxy.ts",import.meta.url),"utf8")]);for(const source of [invite,link,callback,onboarding,proxy])assert.match(source,/coach_client_relationships/);assert.match(invite,/onboarding_completed:true/);assert.match(invite,/return redirect\("\/"\)/);assert.match(link,/if \(!relationship && !onboarding\?\.onboarding_completed\)/);assert.match(callback,/if \(!relationship && !onboarding\?\.onboarding_completed\)/);assert.match(onboarding,/if\(relationship\)redirect\("\/"\)/);assert.match(proxy,/if \(!relationship && !onboarding\?\.onboarding_completed\)/) });
test("menu persistence migration recalculates macros from foods and replaces active assignment",async()=>{const sql=await readFile(new URL("../supabase/migrations/202607200002_secure_mutations.sql",import.meta.url),"utf8");assert.match(sql,/v_food\.calories/);assert.match(sql,/update public\.menus set status = 'published'/);assert.match(sql,/unknown_food/);assert.match(sql,/meal_not_assigned/)});

test("test password login is opt-in and restricted to an exact server allowlist", () => {
  const disabled = { E2E_TEST_LOGIN_ENABLED: "false", E2E_TEST_EMAILS: "coach-test@example.com" };
  const enabled = { E2E_TEST_LOGIN_ENABLED: "true", E2E_TEST_EMAILS: " Coach-Test@example.com, client-test@example.com " };
  assert.equal(isE2ETestLoginEnabled(disabled), false);
  assert.equal(isAllowedE2ETestEmail("coach-test@example.com", disabled), false);
  assert.equal(isE2ETestLoginEnabled(enabled), true);
  assert.deepEqual([...getE2ETestEmails(enabled)], ["coach-test@example.com", "client-test@example.com"]);
  assert.equal(isAllowedE2ETestEmail("COACH-TEST@example.com", enabled), true);
  assert.equal(isAllowedE2ETestEmail("real-user@example.com", enabled), false);
});

test("dedicated test accounts cannot cross the real-user tenant boundary", async () => {
  const [migration, action, loginPage, loginForm, provision, verification, disable, documentation] = await Promise.all([
    readFile(new URL("../supabase/migrations/202607280009_e2e_test_account_isolation.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/login/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/LoginForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/provision-e2e-test-accounts.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify-fixed-e2e-accounts.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/disable-e2e-test-accounts.mjs", import.meta.url), "utf8"),
    readFile(new URL("../docs/e2e-test-accounts.md", import.meta.url), "utf8"),
  ]);
  for (const rule of ["is_test_account", "test_account_tenant_boundary", "disable_e2e_test_accounts", "profile_authority_fields_are_server_managed"]) assert.match(migration, new RegExp(rule));
  assert.match(action, /isAllowedE2ETestEmail/);
  assert.match(action, /is_test_account/);
  assert.doesNotMatch(action, /elicohen/i);
  assert.match(loginPage, /isE2ETestLoginEnabled/);
  assert.match(loginForm, /testLoginEnabled/);
  assert.match(provision, /Refusing to convert non-test account/);
  assert.match(provision, /passwordsPrinted: false/);
  assert.match(verification, /signInWithPassword/);
  assert.match(verification, /test coach can see a real profile/);
  assert.match(verification, /logoutAndRelogin/);
  assert.match(disable, /disable_e2e_test_accounts/);
  assert.match(documentation, /E2E_TEST_LOGIN_ENABLED=false/);
  assert.match(documentation, /never uses a service-role key in the browser/);
});
