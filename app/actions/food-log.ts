"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FOOD_LOG_PHOTO_BUCKET,
  foodLogPhotoPath,
  validateFoodLogPhoto,
} from "@/lib/nutrition/food-log";

export type FoodLogState = Readonly<{ ok: boolean; message?: string }>;

const RULES: Readonly<Record<string, string>> = {
  food_name_required: "יש לכתוב מה אכלת.",
  invalid_food_source: "סוג הרישום אינו מוכר.",
  meal_not_assigned: "הארוחה אינה שייכת לתפריט הפעיל שלך.",
  invalid_photo_path: "התמונה נשמרה במקום לא צפוי. אפשר לנסות שוב.",
  client_required: "רק לקוח יכול לרשום מה אכל.",
};

const describe = (message: string | undefined) => {
  const key = message ? Object.keys(RULES).find((rule) => message.includes(rule)) : undefined;
  return key ? RULES[key] : "הרישום לא נשמר. אפשר לנסות שוב.";
};

const number = (form: FormData, key: string): number | null => {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

const uuid = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(text) ? text : null;
};

/**
 * Records what the client actually ate, when it was not what the plan said.
 *
 * Three shapes arrive here and they differ only in what they carry. A sentence
 * carries no figures and never pretends to. A scan carries the catalog's own
 * numbers, scaled to the amount the client says they had. A photograph carries
 * neither, and is worth more than both to a coach reading it.
 *
 * The entry stands beside the meal rather than inside it: the plan is what the
 * coach wrote and does not change because a person ate something else.
 */
export async function logClientFood(_: FoodLogState, form: FormData): Promise<FoodLogState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return { ok: false, message: RULES.client_required };

  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "תאריך לא תקין." };

  const source = String(form.get("source") ?? "text");
  if (!["text", "scan", "photo"].includes(source)) return { ok: false, message: RULES.invalid_food_source };

  const name = String(form.get("name") ?? "").trim().slice(0, 200);
  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  // A photograph is its own description. Requiring a sentence beside it is the
  // kind of small tax that stops people logging anything at all.
  const resolvedName = name || (hasPhoto ? "תמונה של הארוחה" : "");
  if (!resolvedName) return { ok: false, message: RULES.food_name_required };

  const supabase = await createSupabaseServerClient();

  let photoPath: string | null = null;
  if (hasPhoto) {
    const problem = validateFoodLogPhoto(photo);
    if (problem) return { ok: false, message: problem };
    photoPath = foodLogPhotoPath(auth.id, date, photo.type);
    const { error: uploadError } = await supabase.storage
      .from(FOOD_LOG_PHOTO_BUCKET)
      .upload(photoPath, photo, { contentType: photo.type, upsert: false });
    if (uploadError) return { ok: false, message: "העלאת התמונה נכשלה. אפשר לנסות שוב." };
  }

  const { error } = await supabase.rpc("log_client_food", {
    p_date: date,
    p_name: resolvedName,
    p_source: source,
    p_meal_id: uuid(form.get("mealId")),
    p_food_id: String(form.get("foodId") ?? "").trim() || null,
    p_quantity: number(form, "quantity"),
    p_unit: String(form.get("unit") ?? "").trim() || null,
    p_calories: number(form, "calories"),
    p_protein: number(form, "protein"),
    p_carbs: number(form, "carbs"),
    p_fat: number(form, "fat"),
    p_photo_path: photoPath,
  });

  if (error) {
    // The row failed, so the picture it was for is litter. Removing it is best
    // effort: a leftover object is a tidiness problem, a wrong error message is
    // a correctness one.
    if (photoPath) await supabase.storage.from(FOOD_LOG_PHOTO_BUCKET).remove([photoPath]);
    return { ok: false, message: describe(error.message) };
  }

  // Logging against a meal is also the answer to "did you eat it?" - the meal
  // is marked as eaten-something-else, carrying this entry's own words. Without
  // it the client would have to say the same thing twice, in two controls, and
  // the meal would keep asking.
  const mealId = uuid(form.get("mealId"));
  if (mealId) {
    await supabase.rpc("set_meal_day_status", {
      p_meal_id: mealId,
      p_date: date,
      p_status: "other",
      p_note: resolvedName.slice(0, 500),
    });
  }

  revalidatePath("/nutrition");
  revalidatePath("/");
  return { ok: true, message: "נרשם. המאמן יראה בדיוק מה אכלת." };
}

export async function deleteClientFoodLog(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return;
  const id = uuid(form.get("id"));
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  // The picture goes with the row it belonged to.
  const { data } = await supabase.from("client_food_log").select("photo_path").eq("id", id).maybeSingle();
  await supabase.rpc("delete_client_food_log", { p_id: id });
  const path = data?.photo_path;
  if (path) await supabase.storage.from(FOOD_LOG_PHOTO_BUCKET).remove([String(path)]);
  revalidatePath("/nutrition");
  revalidatePath("/");
}
