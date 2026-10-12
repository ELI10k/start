"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateFoodNutrition } from "@/lib/meal-plans/calculations";
import { verifyMealAnalysis } from "@/lib/nutrition/meal-analysis-signature";
import { isAiMealAnalysisEnabled } from "@/lib/nutrition/ai-meal-feature";

export type SaveAiMealState = Readonly<{ ok: boolean; message?: string }>;
type EditedComponent = { index: number; name: string; grams: number; foodId: string | null };
const uuid = (value: unknown) => /^[0-9a-f-]{36}$/i.test(String(value ?? "")) ? String(value) : null;

export async function saveAiMeal(_: SaveAiMealState, form: FormData): Promise<SaveAiMealState> {
  if (!isAiMealAnalysisEnabled()) return { ok: false, message: "ניתוח ארוחות ב־AI אינו זמין כרגע." };
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return { ok: false, message: "רק לקוח יכול לשמור ארוחה." };
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "התאריך אינו תקין." };
  const signed = verifyMealAnalysis(String(form.get("analysisToken") ?? ""), auth.id);
  if (!signed) return { ok: false, message: "תוצאת הניתוח פגה. יש לנתח את התמונה מחדש." };
  let edits: EditedComponent[];
  try { edits = JSON.parse(String(form.get("components") ?? "[]")) as EditedComponent[]; }
  catch { return { ok: false, message: "רכיבי הארוחה אינם תקינים." }; }
  if (!Array.isArray(edits) || edits.length < 1 || edits.length > 20) return { ok: false, message: "יש להשאיר לפחות רכיב אחד בארוחה." };
  const supabase = await createSupabaseServerClient();
  const requestedFoodIds = [...new Set(edits.map((item) => item.foodId).filter((id): id is string => Boolean(id)))];
  const { data: foods, error: foodError } = requestedFoodIds.length
    ? await supabase.from("foods").select("id,name,calories,protein,carbs,fat").in("id", requestedFoodIds)
    : { data: [], error: null };
  if (foodError) return { ok: false, message: "לא ניתן לטעון את מאגר המזונות כרגע." };
  const foodById = new Map((foods ?? []).map((food) => [String(food.id), food]));
  const components = [];
  for (let order = 0; order < edits.length; order += 1) {
    const edit = edits[order];
    const original = signed.components.find((item) => item.index === Number(edit.index));
    const grams = Number(edit.grams);
    const name = String(edit.name ?? "").trim().slice(0, 200);
    if (!name || !Number.isFinite(grams) || grams <= 0 || grams > 3000) return { ok: false, message: "יש לבדוק את שמות המזונות והכמויות." };
    const food = edit.foodId ? foodById.get(edit.foodId) : null;
    if (edit.foodId && !food) return { ok: false, message: "אחד המזונות שנבחרו אינו קיים במאגר." };
    if (!original && !food) return { ok: false, message: "רכיב חדש יש לבחור ממאגר המזונות." };
    const per100 = food ? { calories: Number(food.calories ?? 0), protein: Number(food.protein ?? 0), carbs: Number(food.carbs ?? 0), fat: Number(food.fat ?? 0) } : original!.per100;
    const macros = calculateFoodNutrition(per100, grams);
    components.push({ index: order, foodId: food ? String(food.id) : null, name: food ? String(food.name) : name, grams, ...macros, per100, nutritionSource: food ? "catalog" : "ai_estimate" });
  }
  const entryId = uuid(form.get("entryId"));
  if (!entryId) return { ok: false, message: "מזהה השמירה אינו תקין." };
  const mealSlot = String(form.get("mealSlot") ?? "");
  if (!["breakfast", "lunch", "dinner", "snack"].includes(mealSlot)) return { ok: false, message: "יש לבחור סוג ארוחה." };
  const saveFavorite = String(form.get("saveFavorite")) === "true";
  const favoriteName = String(form.get("favoriteName") ?? "").trim().slice(0, 80);
  const { error } = await supabase.rpc("save_ai_meal_to_log", {
    p_entry_id: entryId, p_date: date, p_meal_id: uuid(form.get("mealId")), p_meal_slot: mealSlot,
    p_components: components, p_save_meal: saveFavorite, p_saved_meal_name: saveFavorite ? (favoriteName || "ארוחה מצילום AI") : null,
  });
  if (error) { console.error("save_ai_meal_failed", { code: error.code }); return { ok: false, message: "הארוחה לא נשמרה. אפשר לנסות שוב." }; }
  revalidatePath("/nutrition"); revalidatePath("/"); revalidatePath("/my-meals");
  return { ok: true, message: saveFavorite ? "הארוחה נוספה ליומן ונשמרה בארוחות שלי." : "הארוחה נוספה ליומן התזונה." };
}
