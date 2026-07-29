"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  israelDateKey,
  parseOptionalInitialNavel,
} from "@/lib/progress/measurements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailPattern=/^\S+@\S+\.\S+$/;
const value=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const positive=(form:FormData,key:string)=>{const raw=value(form,key);const n=Number(raw);return raw&&Number.isFinite(n)&&n>0?n:null};
const INVITE_EXPIRY_MS=24*60*60*1000;
const inviteExpiry=()=>new Date(Date.now()+INVITE_EXPIRY_MS).toISOString();
const inviteRedirect = () => {
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"");
  if(!siteUrl) throw new Error("site_url_missing");
  return `${siteUrl}/auth/callback?next=/onboarding`;
};
const magicLinkRedirect = () => {
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"");
  if(!siteUrl) throw new Error("site_url_missing");
  return `${siteUrl}/auth/confirm-link`;
};

export type CreateClientState = Readonly<{
  status: "idle" | "error";
  message: string;
}>;

export type ReplacementInviteState = Readonly<{
  status: "idle" | "sent";
  message: string;
}>;

const createClientErrorMessage = (error: unknown) => {
  const code=error instanceof Error?error.message:"unknown";
  if(code==="duplicate_client_email") return "כבר קיים חשבון עם כתובת האימייל הזו.";
  if(code==="invalid_client_details") return "יש להזין שם מלא וכתובת אימייל תקינה.";
  if(code==="not_authorized") return "אין הרשאה ליצור לקוח.";
  return "יצירת הלקוח לא הושלמה. אפשר לנסות שוב בעוד רגע.";
};

export async function createClientFromCoach(_:CreateClientState,form:FormData):Promise<CreateClientState> {
  const coach=await getAuthContext();
  if (!coach || coach.role!=="coach") return {status:"error",message:createClientErrorMessage(new Error("not_authorized"))};
  const fullName=value(form,"fullName"), email=value(form,"email").toLowerCase(), phone=value(form,"phone");
  if(fullName.length<2||!emailPattern.test(email)) return {status:"error",message:createClientErrorMessage(new Error("invalid_client_details"))};
  const initialWeight=positive(form,"weight");
  const initialNavel=parseOptionalInitialNavel(form.get("navelCircumference"));
  if(!initialNavel.ok) return {status:"error",message:initialNavel.message};
  if(initialNavel.value!==null&&!initialWeight) return {status:"error",message:"כדי לשמור היקף טבור התחלתי יש להזין גם משקל נוכחי תקין."};
  let clientId="";
  try {
    const admin=createSupabaseAdminClient();
    const { data: invitation, error: inviteError }=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName},redirectTo:inviteRedirect()});
    if(inviteError||!invitation.user) {
      if(inviteError?.message.toLowerCase().includes("already")) throw new Error("duplicate_client_email");
      throw new Error("client_invitation_failed");
    }
    clientId=invitation.user.id;
    const preferences={
      dietary_preferences:value(form,"dietaryPreferences"), medical_notes:value(form,"medicalNotes"), training_type:value(form,"trainingType"), weekly_workouts:positive(form,"weeklyWorkouts"), food_dislikes:value(form,"foodDislikes"),
    };
    const { error: profileError }=await admin.from("profiles").update({full_name:fullName,phone:phone||null,role:"client",status:"active"}).eq("id",clientId);
    if(profileError) throw new Error("client_profile_failed");
    const { error: roleError }=await admin.from("user_roles").upsert({user_id:clientId,role:"client",assigned_by:coach.id});
    if(roleError) throw new Error("client_role_failed");
    const { error: clientProfileError }=await admin.from("client_profiles").upsert({user_id:clientId,goal:value(form,"goal")||null,target_weight:positive(form,"targetWeight"),height:positive(form,"height"),birth_date:value(form,"birthDate")||null,activity_level:value(form,"activityLevel")||null,preferences,notes:value(form,"medicalNotes")||null,onboarding_completed:false});
    if(clientProfileError) throw new Error("client_intake_failed");
    const { error: relationError }=await admin.from("coach_client_relationships").upsert({coach_id:coach.id,client_id:clientId,status:"active"},{onConflict:"coach_id,client_id"});
    if(relationError) throw new Error("client_relationship_failed");
    const { error: invitationHistoryError }=await admin.from("client_invitations").insert({client_id:clientId,coach_id:coach.id,status:"sent",expires_at:inviteExpiry()});
    if(invitationHistoryError) throw new Error("client_invitation_history_failed");
    if(initialWeight){
      const { error }=await admin.from("progress_entries").upsert(
        {
          client_id:clientId,
          date:israelDateKey(),
          weight:initialWeight,
          navel_circumference:initialNavel.value,
        },
        {onConflict:"client_id,date"},
      );
      if(error)throw new Error("initial_measurements_failed");
    }
  } catch(error) {
    const code=error instanceof Error?error.message:"unknown";
    if(code!=="duplicate_client_email") console.error("Coach client creation failed",code);
    return {status:"error",message:createClientErrorMessage(error)};
  }
  revalidatePath("/coach");revalidatePath("/coach/clients");
  redirect(`/coach/clients/${clientId}?created=1`);
}

export async function resendClientInvite(form: FormData) {
  const coach=await getAuthContext();
  const clientId=value(form,"clientId");
  if(!coach || coach.role!=="coach" || !clientId) throw new Error("not_authorized");

  // The dashboard query is the authorization check: a coach can only re-invite a client
  // already assigned to that coach.
  const { getCoachClientDashboard }=await import("@/lib/data/product-repository");
  const client=await getCoachClientDashboard(coach.id,clientId);
  if(!client) throw new Error("not_authorized");

  const admin=createSupabaseAdminClient();
  const { data: authUser, error: authUserError }=await admin.auth.admin.getUserById(clientId);
  if(authUserError || !authUser.user?.email) throw new Error("client_auth_not_found");
  if(authUser.user.email_confirmed_at) throw new Error("client_already_activated");

  const { error }=await admin.auth.admin.inviteUserByEmail(authUser.user.email,{
    data:{full_name:client.profile.full_name},
    redirectTo:inviteRedirect(),
  });
  if(error) throw new Error("client_invitation_resend_failed");
  const now=new Date().toISOString();
  const { error: supersedeError }=await admin.from("client_invitations").update({status:"superseded"}).eq("client_id",clientId).in("status",["sent","opened"]);
  if(supersedeError) throw new Error("client_invitation_history_failed");
  const { error: historyError }=await admin.from("client_invitations").insert({client_id:clientId,coach_id:coach.id,status:"sent",sent_at:now,expires_at:inviteExpiry()});
  if(historyError) throw new Error("client_invitation_history_failed");
  revalidatePath(`/coach/clients/${clientId}`);
  redirect(`/coach/clients/${clientId}?invite=resent`);
}

export async function requestReplacementInvite(
  _: ReplacementInviteState,
  form: FormData,
): Promise<ReplacementInviteState> {
  const email=value(form,"email").toLowerCase();
  const generic:ReplacementInviteState={
    status:"sent",
    message:"אם קיימת הזמנה פעילה שטרם הושלמה, נשלחה כעת הזמנה חדשה.",
  };
  if(!emailPattern.test(email)) return generic;
  try {
    const admin=createSupabaseAdminClient();
    const {data:profile}=await admin
      .from("profiles")
      .select("id,full_name,role,status")
      .eq("email",email)
      .eq("role","client")
      .maybeSingle();
    if(!profile || profile.status!=="active") return generic;
    const [{data:authUser},{data:relationship},{data:intake}]=await Promise.all([
      admin.auth.admin.getUserById(profile.id),
      admin.from("coach_client_relationships").select("coach_id").eq("client_id",profile.id).eq("status","active").maybeSingle(),
      admin.from("client_profiles").select("onboarding_completed").eq("user_id",profile.id).maybeSingle(),
    ]);
    if(
      !authUser.user?.email ||
      authUser.user.email_confirmed_at ||
      !relationship ||
      intake?.onboarding_completed
    ) return generic;
    const {error}=await admin.auth.admin.inviteUserByEmail(authUser.user.email,{
      data:{full_name:profile.full_name},
      redirectTo:inviteRedirect(),
    });
    if(error) {
      console.error("Replacement invitation failed",{code:error.code,status:error.status});
      return generic;
    }
    const now=new Date().toISOString();
    await admin
      .from("client_invitations")
      .update({status:"superseded"})
      .eq("client_id",profile.id)
      .in("status",["sent","opened"]);
    await admin.from("client_invitations").insert({
      client_id:profile.id,
      coach_id:relationship.coach_id,
      status:"sent",
      sent_at:now,
      expires_at:inviteExpiry(),
    });
  } catch {
    return generic;
  }
  return generic;
}

async function activeCoachClientEmail(clientId:string) {
  const coach=await getAuthContext();
  if(!coach || coach.role!=="coach" || !clientId) throw new Error("not_authorized");
  const { getCoachClientDashboard }=await import("@/lib/data/product-repository");
  const client=await getCoachClientDashboard(coach.id,clientId);
  if(!client) throw new Error("not_authorized");
  const admin=createSupabaseAdminClient();
  const { data, error }=await admin.auth.admin.getUserById(clientId);
  if(error || !data.user?.email || !data.user.email_confirmed_at) throw new Error("client_not_active");
  return data.user.email;
}

export async function sendClientMagicLink(form: FormData) {
  const clientId=value(form,"clientId");
  const email=await activeCoachClientEmail(clientId);
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:magicLinkRedirect(),shouldCreateUser:false}});
  if(error) throw new Error("client_magic_link_failed");
  revalidatePath(`/coach/clients/${clientId}`);
  redirect(`/coach/clients/${clientId}?login=access-link-sent`);
}

export async function sendClientPasswordReset(form: FormData) {
  const clientId=value(form,"clientId");
  const email=await activeCoachClientEmail(clientId);
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.resetPasswordForEmail(email,{redirectTo:inviteRedirect()});
  if(error) throw new Error("client_password_reset_failed");
  revalidatePath(`/coach/clients/${clientId}`);
  redirect(`/coach/clients/${clientId}?login=password-reset-sent`);
}

export async function completeClientOnboarding(form:FormData) {
  const auth=await getAuthContext();if(!auth||auth.role!=="client") throw new Error("not_authorized");
  if(form.get("terms")!=="on") throw new Error("terms_required");
  const supabase=await createSupabaseServerClient();
  const preferences={dietary_preferences:value(form,"dietaryPreferences"),food_dislikes:value(form,"foodDislikes"),allergies:value(form,"allergies"),meal_times:value(form,"mealTimes"),training_experience:value(form,"trainingExperience"),training_location:value(form,"trainingLocation"),equipment:value(form,"equipment"),weekly_workouts:positive(form,"weeklyWorkouts"),preferred_days:value(form,"preferredDays"),reminders:value(form,"reminders")};
  const {error}=await supabase.from("client_profiles").update({goal:value(form,"goal")||null,target_weight:positive(form,"targetWeight"),height:positive(form,"height"),birth_date:value(form,"birthDate")||null,activity_level:value(form,"activityLevel")||null,preferences,notes:value(form,"medicalNotes")||null,onboarding_completed:true,onboarding_completed_at:new Date().toISOString(),terms_accepted_at:new Date().toISOString()}).eq("user_id",auth.id);
  if(error) throw new Error("onboarding_save_failed");
  const weight=positive(form,"weight");if(weight){const {error:progressError}=await supabase.from("progress_entries").upsert({client_id:auth.id,date:new Date().toISOString().slice(0,10),weight,waist:positive(form,"waist")},{onConflict:"client_id,date"});if(progressError)throw new Error("onboarding_weight_failed")}
  const admin=createSupabaseAdminClient();
  await admin.from("client_invitations").update({status:"onboarding_completed",onboarding_completed_at:new Date().toISOString()}).eq("client_id",auth.id).in("status",["sent","opened"]);
  revalidatePath("/");redirect("/");
}
