import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const { supabase, applyAuthState } = createSupabaseRouteClient(request);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;

    if (user && deviceId) {
      await supabase.rpc("deactivate_current_device", { p_device_id: deviceId });
    }
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Logout is intentionally idempotent.
  }

  return applyAuthState(NextResponse.redirect(new URL("/login", request.url), 303));
}
