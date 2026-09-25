"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { permanentlyDeleteOwnAccount } from "@/lib/account/delete-account";
import { revalidatePath } from "next/cache";
import { GOAL_LABELS, isNutritionGoal } from "@/lib/nutrition/energy";
import { getAuthContext } from "@/lib/data/product-repository";

export type DeleteAccountState = Readonly<{
  status: "idle" | "error" | "deleted";
  message: string;
}>;

export const initialDeleteAccountState: DeleteAccountState = { status: "idle", message: "" };

export type NutritionGoalState = Readonly<{ status: "idle" | "saved" | "error"; message: string }>;

export async function updateOwnNutritionGoals(
  _previous: NutritionGoalState,
  formData: FormData,
): Promise<NutritionGoalState> {
  const session = await getAuthContext();
  if (!session || session.role !== "client") return { status: "error", message: "החיבור לחשבון פג. יש להתחבר מחדש." };
  const auth = await createSupabaseServerClient();
  const goal = String(formData.get("nutritionGoal") ?? "");
  const calories = Number(formData.get("calorieTarget"));
  const proteinRaw = String(formData.get("proteinTarget") ?? "").trim();
  const protein = proteinRaw ? Number(proteinRaw) : null;
  const carbohydrateRaw = String(formData.get("carbohydrateTarget") ?? "").trim();
  const carbohydrates = carbohydrateRaw ? Number(carbohydrateRaw) : null;
  const fatRaw = String(formData.get("fatTarget") ?? "").trim();
  const fat = fatRaw ? Number(fatRaw) : null;
  if (!isNutritionGoal(goal)) return { status: "error", message: "יש לבחור מטרה." };
  if (!Number.isFinite(calories) || calories < 800 || calories > 10000)
    return { status: "error", message: "יעד הקלוריות חייב להיות בין 800 ל־10,000." };
  if (protein !== null && (!Number.isFinite(protein) || protein < 1 || protein > 1000))
    return { status: "error", message: "יעד החלבון אינו תקין." };
  if (carbohydrates !== null && (!Number.isFinite(carbohydrates) || carbohydrates < 1 || carbohydrates > 1000))
    return { status: "error", message: "יעד הפחמימה אינו תקין." };
  if (fat !== null && (!Number.isFinite(fat) || fat < 1 || fat > 1000))
    return { status: "error", message: "יעד השומן אינו תקין." };

  const { error } = await auth.from("client_profiles").update({
    nutrition_goal: goal,
    goal: GOAL_LABELS[goal],
    calorie_target: Math.round(calories),
    protein_target: protein === null ? null : Math.round(protein),
    carbohydrate_target: carbohydrates === null ? null : Math.round(carbohydrates),
    fat_target: fat === null ? null : Math.round(fat),
  }).eq("user_id", session.id);
  if (error) return { status: "error", message: "השמירה נכשלה. אפשר לנסות שוב בעוד רגע." };
  revalidatePath("/profile");
  revalidatePath("/nutrition");
  revalidatePath("/");
  return { status: "saved", message: "המטרה והיעדים נשמרו." };
}

export async function deleteOwnAccount(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (String(formData.get("confirmation") ?? "").trim() !== "מחיקה") {
    return { status: "error", message: "יש להקליד את המילה מחיקה בדיוק כפי שהיא מופיעה." };
  }
  if (formData.get("understood") !== "on") {
    return { status: "error", message: "יש לאשר שהמחיקה קבועה לפני שממשיכים." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "החיבור לחשבון פג. יש להתחבר מחדש ולנסות שוב." };

  try {
    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile || profile.role !== "client") {
      return { status: "error", message: "מחיקה עצמית זמינה כרגע לחשבון מתאמן. חשבון מאמן יטופל דרך התמיכה." };
    }

    await permanentlyDeleteOwnAccount(admin, user.id);
    await supabase.auth.signOut({ scope: "local" });
    return { status: "deleted", message: "החשבון וכל הנתונים האישיים נמחקו." };
  } catch (error) {
    console.error("Self-service account deletion failed", {
      userId: user.id,
      kind: error instanceof Error ? error.message : "unknown",
    });
    return {
      status: "error",
      message: "המחיקה לא הושלמה. לא ננסה להסתיר תקלה: יש לפנות לתמיכה כדי שנסיים את הבקשה.",
    };
  }
}
