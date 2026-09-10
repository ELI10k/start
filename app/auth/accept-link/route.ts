import { NextResponse, type NextRequest } from "next/server";
import { destinationForRole } from "@/lib/auth/authorization";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { returnPathForRole } from "@/lib/auth/return-path";

export async function POST(request: NextRequest) {
  const form=await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const requestedPath=String(form.get("next")??"");
  const { supabase, applyAuthState } = createSupabaseRouteClient(request);
  let deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  const redirect = (destination: string) => {
    const response = applyAuthState(NextResponse.redirect(new URL(destination, request.url), 303));
    if (deviceId) response.cookies.set(DEVICE_COOKIE, deviceId, { path: "/", maxAge: 31536000, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
    return response;
  };

  if (!tokenHash) return redirect("/login?error=link");
  const { data: verification, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error || !verification.session || !verification.user) return redirect("/login?error=link");
  const { error: sessionError } = await supabase.auth.setSession({ access_token: verification.session.access_token, refresh_token: verification.session.refresh_token });
  if (sessionError) return redirect("/login?error=link");
  const user = verification.user;
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || (profile.role !== "coach" && profile.role !== "client")) {
    await supabase.auth.signOut({ scope: "local" });
    return redirect("/unauthorized");
  }

  if (profile.role === "client") {
    deviceId = deviceId ?? crypto.randomUUID().replaceAll("-", "");
    const { error: deviceError } = await supabase.rpc("activate_current_device", { p_device_id: deviceId, p_device_name: request.headers.get("user-agent")?.slice(0, 120) || "דפדפן" });
    if (deviceError) {
      await supabase.auth.signOut({ scope: "local" });
      return redirect("/unauthorized?reason=device");
    }
    const [{ data: onboarding }, { data: relationship }] = await Promise.all([
      supabase.from("client_profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle(),
      supabase.from("coach_client_relationships").select("coach_id").eq("client_id", user.id).eq("status", "active").maybeSingle(),
    ]);
    if (!relationship && !onboarding?.onboarding_completed) return redirect("/onboarding");
  }

  return redirect(
    returnPathForRole(requestedPath,profile.role) ??
      destinationForRole(profile.role),
  );
}
