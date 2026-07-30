import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { safeReturnPath } from "@/lib/auth/return-path";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

async function logout(request: NextRequest) {
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

  const requested=safeReturnPath(request.nextUrl.searchParams.get("next"));
  return applyAuthState(NextResponse.redirect(new URL(requested??"/login", request.url), 303));
}

export async function POST(request: NextRequest) {
  return logout(request);
}

// A direct account-switch link is intentionally supported. Logout is idempotent,
// and the destination is restricted to a local application path.
export async function GET(request: NextRequest) {
  return logout(request);
}
