"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBarcode, scannedFoodId, validateManualFood } from "@/lib/nutrition/open-food-facts";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export type ScanState = Readonly<{ ok: boolean; message?: string; foodId?: string }>;

const number = (value: FormDataEntryValue | null): number | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

// Named rules the database raises, in words a person can act on.
const RULES: Record<string, string> = {
  invalid_barcode: "הברקוד אינו תקין. ברקוד מוצר הוא 8, 12 או 13 ספרות.",
  invalid_calories: "ערך הקלוריות אינו סביר ל-100 גרם.",
  invalid_protein: "ערך החלבון אינו סביר ל-100 גרם.",
  invalid_carbs: "ערך הפחמימות אינו סביר ל-100 גרם.",
  invalid_fat: "ערך השומן אינו סביר ל-100 גרם.",
  food_name_required: "יש להזין שם מזון.",
  invalid_food_source: "מקור המזון אינו מוכר.",
};

/**
 * Saves a food that arrived from a scan or from manual entry into the START
 * catalogue, so the next scan of the same barcode resolves locally.
 *
 * Provenance is decided here rather than taken from the form: a client cannot
 * claim their typed-in food is curated START data.
 */
export async function saveScannedFood(_: ScanState, form: FormData): Promise<ScanState> {
  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "אין הרשאה." };

  // The catalogue is shared and a barcode-less entry creates a new row every
  // time, so this writes into something everybody reads. Forty an hour is far
  // above anyone entering their own food and well below a loop.
  if (!(await consumeRateLimit({ action: "catalog_write", subject: auth.id, windowSeconds: 3600, limit: 40 })))
    return { ok: false, message: "נשמרו יותר מדי מזונות חדשים. אפשר לנסות שוב מאוחר יותר." };

  const manual = String(form.get("source") ?? "manual") === "manual";
  const barcode = normalizeBarcode(String(form.get("barcode") ?? "")) ?? "";

  const problems = validateManualFood({
    name: String(form.get("name") ?? ""),
    barcode: String(form.get("barcode") ?? ""),
    calories: String(form.get("calories") ?? ""),
    protein: String(form.get("protein") ?? ""),
    carbs: String(form.get("carbs") ?? ""),
    fat: String(form.get("fat") ?? ""),
  });
  if (problems.length) return { ok: false, message: problems[0] };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("upsert_scanned_food", {
    p_barcode: barcode,
    p_name: String(form.get("name") ?? "").trim(),
    p_brand: String(form.get("brand") ?? "").trim(),
    p_serving_label: String(form.get("servingLabel") ?? "").trim(),
    p_package_unit: String(form.get("packageUnit") ?? "גרם").trim(),
    p_unit_weight_grams: number(form.get("unitWeightGrams")),
    p_calories: number(form.get("calories")),
    p_protein: number(form.get("protein")),
    p_carbs: number(form.get("carbs")),
    p_fat: number(form.get("fat")),
    p_source: manual ? "manual" : "openfoodfacts",
    p_source_url: String(form.get("sourceUrl") ?? "").trim(),
  });

  if (error) {
    const known = Object.keys(RULES).find((rule) => error.message.includes(rule));
    return { ok: false, message: known ? RULES[known] : "המזון לא נשמר. אפשר לנסות שוב." };
  }

  revalidatePath("/nutrition");
  return { ok: true, message: "המזון נשמר ויהיה זמין בפעם הבאה.", foodId: String(data ?? (barcode ? scannedFoodId(barcode) : "")) };
}
