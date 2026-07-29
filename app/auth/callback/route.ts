import { NextResponse, type NextRequest } from "next/server";
import { destinationForRole } from "@/lib/auth/authorization";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { returnPathForRole } from "@/lib/auth/return-path";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const requestedPath=request.nextUrl.searchParams.get("next");
  const { supabase, applyAuthState } = createSupabaseRouteClient(request);
  let issuedDeviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  const redirect = (destination: string) => {
    const response=applyAuthState(NextResponse.redirect(new URL(destination, request.url)));
    if(issuedDeviceId) response.cookies.set(DEVICE_COOKIE,issuedDeviceId,{path:"/",maxAge:31536000,sameSite:"lax",secure:request.nextUrl.protocol==="https:"});
    return response;
  };

  if (!code && !(tokenHash && (type === "magiclink" || type === "invite"))) { console.error("Auth callback missing credential"); return redirect("/login?error=callback"); }

  try {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as "magiclink" | "invite" });
    if (error) { console.error("Auth callback exchange failed", { code: error.code, status: error.status, message: error.message }); return redirect("/login?error=callback"); }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return redirect("/login?error=callback");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", user.id)
      .single();
    if (
      !profile ||
      profile.status !== "active" ||
      (profile.role !== "coach" && profile.role !== "client")
    ) {
      await supabase.auth.signOut({ scope: "local" });
      return redirect("/unauthorized");
    }

    if (profile.role === "client") {
      const deviceId = issuedDeviceId ?? crypto.randomUUID().replaceAll("-", "");
      issuedDeviceId=deviceId;

      const deviceName = request.headers.get("user-agent")?.slice(0, 120) || "דפדפן";
      const { error: deviceError } = await supabase.rpc("activate_current_device", {
        p_device_id: deviceId,
        p_device_name: deviceName,
      });
      if (deviceError) {
        await supabase.auth.signOut({ scope: "local" });
        return redirect("/unauthorized?reason=device");
      }
    }

    if (profile.role === "client") {
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
  } catch (error) {
    console.error("Auth callback unexpected failure", { message: error instanceof Error ? error.message : "unknown" });
    return redirect("/login?error=callback");
  }
}
