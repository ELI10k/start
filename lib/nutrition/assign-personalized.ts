import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildPersonalizedMenu, dietaryReviewReason, type DietaryIntake, type GenerationStatus, type TaggedFood } from "./personalization";
import type { MacroTargets } from "./macro-targets";

export type NutritionAssignmentResult = Readonly<{ status: GenerationStatus; message: string; mealPlanId?: string }>;

export async function assignPersonalizedNutrition(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  clientId: string,
  intake: DietaryIntake,
  calorieTarget: number,
  macros: MacroTargets,
): Promise<NutritionAssignmentResult> {
  const review = dietaryReviewReason(intake);
  if (review) return { status: "needs_review", message: review };
  const { data: active, error: activeError } = await admin.from("client_meal_plan_assignments").select("meal_plan_id").eq("client_id", clientId).eq("status", "active").limit(1).maybeSingle();
  if (activeError) return { status: "failed", message: "לא ניתן היה לבדוק אם קיים תפריט פעיל." };
  if (active) return { status: "ready", mealPlanId: String(active.meal_plan_id), message: "התפריט הפעיל הקיים נשמר ללא שינוי." };
  const { data, error } = await admin.from("foods").select("id,name,calories,protein,carbs,fat,vegan,vegetarian,pescatarian,contains_gluten,contains_lactose,allergens,dietary_tags,dietary_metadata_verified").eq("dietary_metadata_verified", true);
  if (error) return { status: "failed", message: "קריאת מאגר המזונות המאושר נכשלה." };
  const foods: TaggedFood[] = (data ?? []).map(row => ({
    id: String(row.id), name: String(row.name), calories: Number(row.calories), protein: Number(row.protein ?? 0), carbs: Number(row.carbs ?? 0), fat: Number(row.fat ?? 0),
    vegan: Boolean(row.vegan), vegetarian: Boolean(row.vegetarian), pescatarian: Boolean(row.pescatarian), containsGluten: Boolean(row.contains_gluten), containsLactose: Boolean(row.contains_lactose),
    allergens: Array.isArray(row.allergens) ? row.allergens.map(String) : [], dietaryTags: Array.isArray(row.dietary_tags) ? row.dietary_tags.map(String) : [], metadataVerified: Boolean(row.dietary_metadata_verified),
  }));
  const plan = buildPersonalizedMenu(intake, foods, calorieTarget, macros);
  if (!plan) return { status: "unavailable", message: "אין במאגר המאושר מספיק מזונות שמתאימים לכל המגבלות; התפריט לא הופעל." };
  const { data: planId, error: rpcError } = await admin.rpc("assign_digital_intake_meal_plan", { p_client_id: clientId, p_plan: plan, p_rules_version: "digital-nutrition-v1" });
  if (rpcError) {
    console.error("Digital nutrition assignment failed", { code: rpcError.code });
    return { status: "failed", message: "יצירת התפריט נכשלה. הנתונים נשמרו ואפשר לנסות שוב." };
  }
  return { status: "ready", mealPlanId: String(planId), message: "נוצר והופעל תפריט אישי לפי שאלון האפיון." };
}
