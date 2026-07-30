import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  loginPathFor,
  returnPathForRole,
  safeReturnPath,
} from "../lib/auth/return-path.ts";

test("return paths are local, role-compatible and preserve query strings",()=>{
  assert.equal(safeReturnPath("/coach/menus?status=active"),"/coach/menus?status=active");
  assert.equal(safeReturnPath("https://evil.example/coach"),null);
  assert.equal(safeReturnPath("//evil.example/coach"),null);
  assert.equal(safeReturnPath("/auth/callback"),null);
  assert.equal(returnPathForRole("/coach/clients","coach"),"/coach/clients");
  assert.equal(returnPathForRole("/coach/clients","client"),null);
  assert.equal(returnPathForRole("/nutrition","client"),"/nutrition");
  assert.equal(returnPathForRole("/nutrition","coach"),null);
  assert.equal(loginPathFor("/coach/clients/123"),"/login?next=%2Fcoach%2Fclients%2F123");
});

test("proxy distinguishes missing sessions from wrong roles and keeps refresh cookies",()=>{
  const proxy=readFileSync(new URL("../proxy.ts",import.meta.url),"utf8");
  assert.match(proxy,/if \(!user\) return redirect\(loginPathFor\(requestedPath\)\)/);
  assert.match(proxy,/if \(profileError \|\| !profile\) return redirect\(loginPathFor\(requestedPath\)\)/);
  assert.match(proxy,/return redirect\("\/unauthorized"\)/);
  assert.match(proxy,/pendingCookies/);
  assert.match(proxy,/returnPathForRole/);
  assert.doesNotMatch(proxy,/if \(!deviceId\) return redirect\("\/unauthorized/);
});

test("login preserves the requested route and no longer navigates away on mount",()=>{
  const [form,actions,accept]=[
    "../components/auth/LoginForm.tsx",
    "../app/login/actions.ts",
    "../app/auth/accept-link/route.ts",
  ].map(path=>readFileSync(new URL(path,import.meta.url),"utf8"));
  assert.match(form,/name="next"/);
  assert.doesNotMatch(form,/router\.replace\("\/login"\)/);
  assert.match(actions,/emailRedirectTo: `\$\{siteUrl\}\/auth\/confirm-link\$\{returnQuery\}`/);
  assert.match(accept,/returnPathForRole/);
});

test("client invitations use 24 hours and expired links can safely resend",()=>{
  const [actions,config,login,expiredForm]=[
    "../app/actions/onboarding.ts",
    "../supabase/config.toml",
    "../app/login/page.tsx",
    "../components/auth/ExpiredInviteForm.tsx",
  ].map(path=>readFileSync(new URL(path,import.meta.url),"utf8"));
  assert.match(actions,/INVITE_EXPIRY_MS=24\*60\*60\*1000/);
  assert.match(config,/otp_expiry = 86400/);
  assert.match(actions,/requestReplacementInvite/);
  assert.match(actions,/email_confirmed_at/);
  assert.match(actions,/status:"superseded"/);
  assert.match(actions,/client_invitations/);
  assert.match(expiredForm,/שליחת הזמנה חדשה/);
  assert.match(login,/לא ייווצר לקוח נוסף/);
});
