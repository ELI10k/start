"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FOOD_LOG_PHOTO_BUCKET,
  foodLogPhotoPath,
  validateFoodLogPhoto,
} from "@/lib/nutrition/food-log";
import { estimateFoodNutrition } from "@/lib/nutrition/food-estimator";
import { detectImageFormat } from "@/lib/images/signature";
import { consumeRateLimit } from "@/lib/security/rate-limit";

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
 * Catalogue and barcode entries carry deterministic figures. A sentence or a
 * photograph is estimated by the server-side model, validated, and labelled as
 * an estimate before it is allowed into the day's totals.
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
  const galleryPhoto = form.get("photo");
  const cameraPhoto = form.get("cameraPhoto");
  const photo = galleryPhoto instanceof File && galleryPhoto.size > 0 ? galleryPhoto : cameraPhoto;
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (source === "photo" && !hasPhoto) return { ok: false, message: "יש לצלם את הארוחה או לבחור תמונה מהגלריה." };
  // A photograph is its own description. Requiring a sentence beside it is the
  // kind of small tax that stops people logging anything at all.
  let resolvedName = name || (hasPhoto ? "תמונה של הארוחה" : "");
  if (!resolvedName) return { ok: false, message: RULES.food_name_required };

  let calories = number(form, "calories");
  let protein = number(form, "protein");
  let carbs = number(form, "carbs");
  let fat = number(form, "fat");
  const needsEstimate = source === "text" || source === "photo";
  // An estimate that does not arrive is not a reason to lose the entry.
  //
  // The estimator is one HTTP call to an external gateway, and it fails for
  // reasons that have nothing to do with the client: an expired deployment
  // token, a provider outage, a slow answer past the estimator's own deadline.
  // Refusing the save on any of those threw away the one thing that cannot be
  // reconstructed later - what the person actually ate - and told them to pick
  // something from a catalogue that does not contain their mother's cooking.
  //
  // So the row is written either way. With figures it joins the day's totals;
  // without them it is stored unmeasured, which the screens already understand
  // and already say out loud ("אינם נספרים - אין להם ערכים מאושרים"), and the
  // coach still sees the sentence the client wrote.
  let estimateFailed = false;
  let estimateRateLimited = false;
  if (needsEstimate) {
    // The ceiling belongs on the paid call, not on the save. Refusing the whole
    // action here threw away the sentence the client had written - the one
    // thing the paragraph above says cannot be reconstructed later - and
    // because consumeRateLimit fails closed, a missing service key or a brief
    // database problem stopped food logging altogether rather than stopping
    // the estimator. So a client over their allowance takes the same path as
    // an unreachable gateway: the row is written, unmeasured.
    const [minuteAllowed, dailyAllowed] = await Promise.all([
      consumeRateLimit({ action: "food_ai_minute", subject: auth.id, windowSeconds: 60, limit: 5 }),
      consumeRateLimit({ action: "food_ai_day", subject: auth.id, windowSeconds: 86_400, limit: 50 }),
    ]);
    estimateRateLimited = !minuteAllowed || !dailyAllowed;
    const estimate = estimateRateLimited
      ? null
      : await estimateFoodNutrition({ description: name, photo: hasPhoto ? photo : undefined });
    if (estimate) {
      resolvedName = name || estimate.name;
      ({ calories, protein, carbs, fat } = estimate);
    } else {
      estimateFailed = true;
      calories = null;
      protein = null;
      carbs = null;
      fat = null;
    }
  }

  const supabase = await createSupabaseServerClient();

  let photoPath: string | null = null;
  if (hasPhoto) {
    const problem = validateFoodLogPhoto(photo);
    if (problem) return { ok: false, message: problem };
    // photo.type is the browser's word for it; these are the bytes.
    if ((await detectImageFormat(photo)) !== photo.type)
      return { ok: false, message: "התמונה אינה קובץ JPG, PNG או WebP תקין." };
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
    p_calories: calories,
    p_protein: protein,
    p_carbs: carbs,
    p_fat: fat,
    p_photo_path: photoPath,
  });

  if (error) {
    // The row failed, so the picture it was for is litter. Removing it is best
    // effort: a leftover object is a tidiness problem, a wrong error message is
    // a correctness one.
    if (photoPath) await supabase.storage.from(FOOD_LOG_PHOTO_BUCKET).remove([photoPath]);
    return { ok: false, message: describe(error.message) };
  }

  // Logging against a meal is also the answer to "did you eat it?" - so an
  // unanswered meal is marked as eaten-something-else, carrying this entry's own
  // words. Without it the client would have to say the same thing twice, in two
  // controls, and the meal would keep asking.
  //
  // Two meals must NOT be marked, and both used to be:
  //
  //   * a meal already answered. Marking "other" deletes the meal's recorded
  //     intake, so a client who marked breakfast eaten and then scanned a snack
  //     against it lost the mark and the day's calories fell by a whole meal -
  //     silently, as the side effect of logging something extra.
  //   * a free-calorie meal. There is no plan to have eaten instead of: filling
  //     the window IS the plan, and calling it a substitution both mislabels it
  //     on the client's screen and tells the coach the frame was missed.
  const mealId = uuid(form.get("mealId"));
  if (mealId && String(form.get("preserveMealStatus")) !== "true") {
    const [{ data: meal }, { data: existing }] = await Promise.all([
      supabase.from("meals").select("free_calorie_target").eq("id", mealId).maybeSingle(),
      supabase.from("meal_day_status").select("status").eq("client_id", auth.id).eq("meal_id", mealId).eq("status_date", date).maybeSingle(),
    ]);
    const isFreeCalorieMeal = Boolean(meal?.free_calorie_target);
    if (!isFreeCalorieMeal && !existing)
      await supabase.rpc("set_meal_day_status", {
        p_meal_id: mealId,
        p_date: date,
        p_status: "other",
        p_note: resolvedName.slice(0, 500),
      });
  }

  revalidatePath("/nutrition");
  revalidatePath("/");
  return { ok: true, message: estimateRateLimited
    ? "נרשם — הגעת למספר ההערכות המרבי לעכשיו, אז הפריט נשמר בלי ערכים. אפשר להזין אותם ידנית או לנסות שוב מאוחר יותר."
    : estimateFailed
      ? "נרשם — אבל לא הצלחנו להעריך את הערכים כרגע, אז הפריט לא נספר בסיכום של היום. המאמן רואה מה נכתב."
    : needsEstimate
      ? `נרשם עם הערכה: ${calories} קל׳ · ${protein} ג׳ חלבון · ${carbs} ג׳ פחמימות · ${fat} ג׳ שומן.`
      : "נרשם ונוסף לסיכום של היום." };
}

export async function deleteClientFoodLog(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return;
  const id = uuid(form.get("id"));
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  // The picture goes with the row it belonged to.
  const { data } = await supabase.from("client_food_log").select("photo_path").eq("id", id).eq("client_id", auth.id).maybeSingle();
  const { data: deleted, error } = await supabase.rpc("delete_client_food_log", { p_id: id });
  if (error || deleted !== true) {
    console.error("food_log_delete_failed", { id, code: error?.code, message: error?.message });
    return;
  }
  const path = data?.photo_path;
  if (path) await supabase.storage.from(FOOD_LOG_PHOTO_BUCKET).remove([String(path)]);
  revalidatePath("/nutrition");
  revalidatePath("/");
}
