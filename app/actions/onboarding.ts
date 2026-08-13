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
import { siteUrlForRedirect } from "@/lib/auth/site-url";
import { GOAL_LABELS, isNutritionGoal, type NutritionGoal } from "@/lib/nutrition/energy";
import { assignmentsToAdd, isTraineeLevel, type TraineeLevel } from "@/lib/workouts/trainee-level";

/**
 * Gives a client the programmes their trainee level starts with.
 *
 * Only ever adds. A programme the client already has is left alone, and nothing
 * is ever removed - a completed workout belongs to the assignment it was
 * performed under, so dropping an assignment would orphan that history. Removing
 * a programme stays a deliberate act by the coach.
 *
 * Programmes are matched by exact name against what is already in the
 * catalogue; this never imports or creates one. A name the catalogue does not
 * have simply yields no assignment.
 */
async function assignLevelProgrammes(
  admin:ReturnType<typeof createSupabaseAdminClient>,
  clientId:string,
  level:TraineeLevel,
  // Which of the level's programmes the coach actually ticked. Empty means the
  // whole level, which is what the self-serve onboarding path passes.
  chosenNames:readonly string[]=[],
){
  const[{data:catalogue},{data:existing}]=await Promise.all([
    admin.from("workout_programs").select("id,name,training_frequency").eq("status","active"),
    admin.from("workout_assignments").select("program_id").eq("client_id",clientId).in("status",["active","paused"]),
  ]);
  const programmes=(catalogue??[]).map(row=>({id:String(row.id),name:String(row.name),trainingFrequency:row.training_frequency?Number(row.training_frequency):undefined}));
  const assigned=(existing??[]).map(row=>String(row.program_id));
  const wanted=assignmentsToAdd(level,programmes,assigned);
  // A level with three splits is not three programmes a beginner should be given
  // blindly. When the coach narrowed the list, honour exactly that.
  const toAdd=chosenNames.length
    ? wanted.filter(programme=>chosenNames.includes(programme.name.trim()))
    : wanted;
  if(!toAdd.length)return;

  // A client trains several programmes side by side here, so these go in as
  // active rows directly rather than through assign_workout_program, which
  // deliberately keeps exactly one active assignment.
  const{error}=await admin.from("workout_assignments").insert(toAdd.map(programme=>({
    client_id:clientId,
    program_id:programme.id,
    start_date:israelDateKey(),
    weekly_frequency:programme.trainingFrequency??3,
    status:"active",
  })));
  // A failure here must not undo a created client: the coach can assign by hand.
  if(error)console.error("level programme assignment failed",{clientId,level,message:error.message});
}

const emailPattern=/^\S+@\S+\.\S+$/;
const value=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const positive=(form:FormData,key:string)=>{const raw=value(form,key);const n=Number(raw);return raw&&Number.isFinite(n)&&n>0?n:null};
const nonNegative=(form:FormData,key:string)=>{const raw=value(form,key);const n=Number(raw);return raw&&Number.isFinite(n)&&n>=0?n:null};
const INVITE_EXPIRY_MS=24*60*60*1000;
const inviteExpiry=()=>new Date(Date.now()+INVITE_EXPIRY_MS).toISOString();
// Both come back to the deployment the coach was actually using. On a preview
// that is the preview's own hostname, which cannot be configured ahead of time
// because it is generated per deployment.
const inviteRedirect = async () => {
  const siteUrl=await siteUrlForRedirect();
  if(!siteUrl) throw new Error("site_url_missing");
  return `${siteUrl}/auth/callback?next=/onboarding`;
};
const magicLinkRedirect = async () => {
  const siteUrl=await siteUrlForRedirect();
  if(!siteUrl) throw new Error("site_url_missing");
  return `${siteUrl}/auth/confirm-link?next=/`;
};

export type CreateClientState = Readonly<{
  status: "idle" | "error";
  message: string;
}>;

export type ReplacementInviteState = Readonly<{
  status: "idle" | "sent";
  message: string;
}>;

export type IntakeState = Readonly<{
  status: "idle" | "saved" | "error";
  message: string;
}>;

/**
 * Fills in the calorie inputs for a client who already exists.
 *
 * The intake form only runs once, at creation, so every client created before
 * these columns existed has no age, sex, step count, goal or level - and the
 * builder can only keep naming what is missing. This is the way to answer it,
 * and it is the only writer of those columns outside the two intake paths.
 *
 * A blank field clears the column rather than being ignored: a coach correcting
 * a wrong age to "unknown" has to be able to say so. Trainee level is stored and
 * nothing else - it never touches an assignment here, so it cannot disturb a
 * workout the client has already done.
 */
export async function updateClientIntake(_:IntakeState,form:FormData):Promise<IntakeState> {
  const coach=await getAuthContext();
  const clientId=value(form,"clientId");
  if(!coach || coach.role!=="coach" || !clientId) return {status:"error",message:"אין הרשאה לעדכן את נתוני הלקוח."};

  // Same authorization as every other coach action here: the dashboard query
  // returns nothing unless this coach is actually this client's coach.
  const { getCoachClientDashboard }=await import("@/lib/data/product-repository");
  const client=await getCoachClientDashboard(coach.id,clientId);
  if(!client) return {status:"error",message:"אין הרשאה לעדכן את נתוני הלקוח."};

  const nutritionGoal=isNutritionGoal(value(form,"nutritionGoal"))?value(form,"nutritionGoal") as NutritionGoal:null;
  const traineeLevel=isTraineeLevel(value(form,"traineeLevel"))?value(form,"traineeLevel") as TraineeLevel:null;
  const age=positive(form,"ageYears");
  const sex=value(form,"sex");
  if(age!==null && (age<12 || age>100)) return {status:"error",message:"גיל חייב להיות בין 12 ל־100."};
  const steps=value(form,"dailySteps")?Number(value(form,"dailySteps")):null;
  if(steps!==null && (!Number.isFinite(steps) || steps<0 || steps>60000)) return {status:"error",message:"ממוצע צעדים יומי חייב להיות בין 0 ל־60,000."};
  const height=positive(form,"height");
  const weeklyWorkouts=nonNegative(form,"weeklyWorkouts");
  if(weeklyWorkouts!==null && weeklyWorkouts>14) return {status:"error",message:"מספר האימונים בשבוע חייב להיות בין 0 ל־14."};

  const admin=createSupabaseAdminClient();
  // The session count lives inside the preferences blob rather than in a column
  // of its own, so it is merged in - overwriting the blob would drop the
  // allergies, meal times and equipment the intake put there.
  const { data: existing }=await admin.from("client_profiles").select("preferences").eq("user_id",clientId).maybeSingle();
  const currentPreferences=existing?.preferences && typeof existing.preferences==="object" && !Array.isArray(existing.preferences)
    ? existing.preferences as Record<string,unknown>
    : {};
  const preferences={...currentPreferences,weekly_workouts:weeklyWorkouts};

  const { error }=await admin.from("client_profiles").update({
    preferences,
    age_years:age,
    sex:sex==="male"||sex==="female"?sex:null,
    height,
    daily_steps:steps,
    nutrition_goal:nutritionGoal,
    trainee_level:traineeLevel,
    // The free-text goal stays in step with the structured one, so the client
    // card and the older screens do not disagree about what the client is doing.
    goal:nutritionGoal?GOAL_LABELS[nutritionGoal]:null,
  }).eq("user_id",clientId);
  if(error) return {status:"error",message:"השמירה נכשלה. אפשר לנסות שוב בעוד רגע."};

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/coach/menus/new");
  return {status:"saved",message:"נתוני הקליטה נשמרו. יעד הקלוריות בבונה התפריט יחושב מהם."};
}

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
    const {data:coachProfile,error:coachProfileError}=await admin.from("profiles").select("is_test_account").eq("id",coach.id).single();
    if(coachProfileError) throw new Error("coach_profile_failed");
    const { data: invitation, error: inviteError }=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName},redirectTo:await inviteRedirect()});
    if(inviteError||!invitation.user) {
      if(inviteError?.message.toLowerCase().includes("already")) throw new Error("duplicate_client_email");
      throw new Error("client_invitation_failed");
    }
    clientId=invitation.user.id;
    if(coachProfile.is_test_account){
      const {error:testAuthError}=await admin.auth.admin.updateUserById(clientId,{
        app_metadata:{...invitation.user.app_metadata,role:"client",is_test_account:true},
      });
      if(testAuthError) throw new Error("client_test_isolation_failed");
    }
    // Dietary preferences and food dislikes are no longer collected here: they
    // were free text nothing read, and the menu is built from the approved
    // catalogue rather than from a sentence.
    const preferences={
      medical_notes:value(form,"medicalNotes"), weekly_workouts:nonNegative(form,"weeklyWorkouts"),
    };
    const { error: profileError }=await admin.from("profiles").update({full_name:fullName,phone:phone||null,role:"client",status:"active",is_test_account:coachProfile.is_test_account}).eq("id",clientId);
    if(profileError) throw new Error("client_profile_failed");
    const { error: roleError }=await admin.from("user_roles").upsert({user_id:clientId,role:"client",assigned_by:coach.id});
    if(roleError) throw new Error("client_role_failed");
    const nutritionGoal=isNutritionGoal(value(form,"nutritionGoal"))?value(form,"nutritionGoal"):null;
    const traineeLevel=isTraineeLevel(value(form,"traineeLevel"))?value(form,"traineeLevel"):null;
    const { error: clientProfileError }=await admin.from("client_profiles").upsert({
      user_id:clientId,
      goal:nutritionGoal?GOAL_LABELS[nutritionGoal as NutritionGoal]:null,
      nutrition_goal:nutritionGoal,
      trainee_level:traineeLevel,
      age_years:positive(form,"ageYears"),
      sex:value(form,"sex")==="male"||value(form,"sex")==="female"?value(form,"sex"):null,
      daily_steps:nonNegative(form,"dailySteps"),
      target_weight:positive(form,"targetWeight"),
      height:positive(form,"height"),
      preferences,
      notes:value(form,"medicalNotes")||null,
      onboarding_completed:false,
    });
    if(clientProfileError) throw new Error("client_intake_failed");
    // Assignment used to happen silently whenever a level was picked, so a coach
    // could not tell whether the client had programmes until they opened the
    // client. It is a choice on the form now, ticked by default, and the form
    // names the programmes it will assign before the coach submits.
    const autoAssign=value(form,"autoAssignProgrammes")==="on";
    const chosenProgrammes=form.getAll("levelProgrammes").map(String).filter(Boolean);
    if(traineeLevel&&autoAssign)await assignLevelProgrammes(admin,clientId,traineeLevel as TraineeLevel,chosenProgrammes);
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
    redirectTo:await inviteRedirect(),
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
      redirectTo:await inviteRedirect(),
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
  const { error }=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:await magicLinkRedirect(),shouldCreateUser:false}});
  if(error) throw new Error("client_magic_link_failed");
  revalidatePath(`/coach/clients/${clientId}`);
  redirect(`/coach/clients/${clientId}?login=access-link-sent`);
}

export async function sendClientPasswordReset(form: FormData) {
  const clientId=value(form,"clientId");
  const email=await activeCoachClientEmail(clientId);
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.resetPasswordForEmail(email,{redirectTo:await inviteRedirect()});
  if(error) throw new Error("client_password_reset_failed");
  revalidatePath(`/coach/clients/${clientId}`);
  redirect(`/coach/clients/${clientId}?login=password-reset-sent`);
}

export async function completeClientOnboarding(form:FormData) {
  const auth=await getAuthContext();if(!auth||auth.role!=="client") throw new Error("not_authorized");
  if(form.get("terms")!=="on") throw new Error("terms_required");
  const supabase=await createSupabaseServerClient();
  // The same columns the coach's intake writes. Two paths writing two shapes is
  // how a client ends up with a calorie target the builder cannot compute: the
  // fields it needs would exist for one kind of client and not the other.
  const preferences={allergies:value(form,"allergies"),meal_times:value(form,"mealTimes"),training_location:value(form,"trainingLocation"),equipment:value(form,"equipment"),weekly_workouts:positive(form,"weeklyWorkouts"),preferred_days:value(form,"preferredDays"),training_type:value(form,"trainingType")};
  const nutritionGoal=isNutritionGoal(value(form,"nutritionGoal"))?value(form,"nutritionGoal"):null;
  const traineeLevel=isTraineeLevel(value(form,"traineeLevel"))?value(form,"traineeLevel"):null;
  const {error}=await supabase.from("client_profiles").update({
    goal:nutritionGoal?GOAL_LABELS[nutritionGoal as NutritionGoal]:null,
    nutrition_goal:nutritionGoal,
    trainee_level:traineeLevel,
    age_years:positive(form,"ageYears"),
    sex:value(form,"sex")==="male"||value(form,"sex")==="female"?value(form,"sex"):null,
    daily_steps:positive(form,"dailySteps"),
    target_weight:positive(form,"targetWeight"),
    height:positive(form,"height"),
    preferences,
    notes:value(form,"medicalNotes")||null,
    onboarding_completed:true,
    onboarding_completed_at:new Date().toISOString(),
    terms_accepted_at:new Date().toISOString(),
  }).eq("user_id",auth.id);
  if(error) throw new Error("onboarding_save_failed");
  // A client who told us their level gets the matching programmes, exactly as
  // one created by the coach does.
  if(traineeLevel)await assignLevelProgrammes(createSupabaseAdminClient(),auth.id,traineeLevel as TraineeLevel);
  const weight=positive(form,"weight");if(weight){const {error:progressError}=await supabase.from("progress_entries").upsert({client_id:auth.id,date:israelDateKey(),weight,navel_circumference:positive(form,"navelCircumference")},{onConflict:"client_id,date"});if(progressError)throw new Error("onboarding_weight_failed")}
  const admin=createSupabaseAdminClient();
  await admin.from("client_invitations").update({status:"onboarding_completed",onboarding_completed_at:new Date().toISOString()}).eq("client_id",auth.id).in("status",["sent","opened"]);
  revalidatePath("/");redirect("/");
}
