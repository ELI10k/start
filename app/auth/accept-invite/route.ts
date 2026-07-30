import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const form=await request.formData();
  const tokenHash=String(form.get("token_hash") ?? "");
  const { supabase, applyAuthState }=createSupabaseRouteClient(request);
  let deviceId=request.cookies.get(DEVICE_COOKIE)?.value;
  const redirect=(destination:string)=>{
    const response=applyAuthState(NextResponse.redirect(new URL(destination,request.url),303));
    if(deviceId) response.cookies.set(DEVICE_COOKIE,deviceId,{path:"/",maxAge:31536000,sameSite:"lax",secure:request.nextUrl.protocol==="https:"});
    return response;
  };
  if(!tokenHash) return redirect("/login?error=invite");
  const { data: verification, error }=await supabase.auth.verifyOtp({token_hash:tokenHash,type:"invite"});
  if(error || !verification.session || !verification.user) return redirect("/login?error=invite");
  // Persist the verified session explicitly before issuing the redirect. This
  // avoids relying on a follow-up getUser() call to flush auth cookies.
  const { error: sessionError } = await supabase.auth.setSession({access_token:verification.session.access_token,refresh_token:verification.session.refresh_token});
  if(sessionError) return redirect("/login?error=invite");
  const user=verification.user;
  await createSupabaseAdminClient().from("client_invitations").update({status:"opened",opened_at:new Date().toISOString()}).eq("client_id",user.id).eq("status","sent");
  const { data:profile }=await supabase.from("profiles").select("role,status").eq("id",user.id).maybeSingle();
  if(!profile || profile.status!=="active" || profile.role!=="client") {
    await supabase.auth.signOut({scope:"local"});
    return redirect("/unauthorized");
  }
  const { data: relationship }=await supabase.from("coach_client_relationships").select("coach_id").eq("client_id",user.id).eq("status","active").maybeSingle();
  deviceId=deviceId ?? crypto.randomUUID().replaceAll("-","");
  const { error:deviceError }=await supabase.rpc("activate_current_device",{p_device_id:deviceId,p_device_name:request.headers.get("user-agent")?.slice(0,120) || "דפדפן"});
  if(deviceError) {
    await supabase.auth.signOut({scope:"local"});
    return redirect("/unauthorized?reason=device");
  }
  if (relationship) {
    const admin=createSupabaseAdminClient();
    const now=new Date().toISOString();
    await admin.from("client_profiles").update({onboarding_completed:true,onboarding_completed_at:now}).eq("user_id",user.id).eq("onboarding_completed",false);
    await admin.from("client_invitations").update({status:"onboarding_completed",onboarding_completed_at:now}).eq("client_id",user.id).in("status",["sent","opened"]);
    return redirect("/");
  }
  return redirect("/onboarding");
}
