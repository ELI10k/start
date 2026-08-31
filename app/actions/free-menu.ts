"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/data/product-repository";

export type FreeMenuState = Readonly<{ ok: boolean; message?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(form: FormData, key: string, max: number, required = false) {
  const value = String(form.get(key) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`invalid_${key}`);
  return value;
}

function boundedNumber(form: FormData, key: string, min: number, max: number, required = false) {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) {
    if (required) throw new Error(`invalid_${key}`);
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${key}`);
  return value;
}

export async function enableFreeMenu(_: FreeMenuState, form: FormData): Promise<FreeMenuState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") return { ok: false, message: "אין הרשאה." };
  try {
    const date = text(form, "date", 10, true);
    const clientId = text(form, "clientId", 36, true);
    if (!DATE.test(date) || !UUID.test(clientId)) throw new Error("invalid_target");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("enable_free_menu_day", {
      p_client_id: clientId,
      p_date: date,
      p_calorie_target: boundedNumber(form, "calorieTarget", 0, 10_000),
      p_protein_target: boundedNumber(form, "proteinTarget", 0, 1_000),
    });
    if (error) throw error;
    revalidatePath(`/coach/clients/${clientId}`);
    return { ok: true, message: "התפריט החופשי הופעל." };
  } catch {
    return { ok: false, message: "יש לבחור לקוח, תאריך ויעדים תקינים." };
  }
}

export async function saveFreeMenuEntry(_: FreeMenuState, form: FormData): Promise<FreeMenuState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return { ok: false, message: "אין הרשאה." };
  try {
    const date = text(form, "date", 10, true);
    const time = text(form, "time", 5) || "12:00";
    const name = text(form, "name", 200, true);
    const foodId = text(form, "foodId", 200);
    const unit = text(form, "unit", 30) || "g";
    const meal = text(form, "meal", 80) || "חופשי";
    const notes = text(form, "notes", 1_000);
    const requestKey = text(form, "requestKey", 100);
    if (!DATE.test(date) || !TIME.test(time)) throw new Error("invalid_datetime");
    const eatenAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(eatenAt.getTime())) throw new Error("invalid_datetime");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("save_free_menu_entry_v2", {
      p_date: date,
      p_food_id: foodId,
      p_name: name,
      p_quantity: boundedNumber(form, "quantity", 0.01, 100_000, true),
      p_unit: unit,
      p_meal_label: meal,
      p_eaten_at: eatenAt.toISOString(),
      p_notes: notes,
      p_calories: boundedNumber(form, "calories", 0, 5_000),
      p_protein: boundedNumber(form, "protein", 0, 500),
      p_carbohydrates: boundedNumber(form, "carbs", 0, 1_000),
      p_fat: boundedNumber(form, "fat", 0, 500),
      p_request_key: requestKey,
    });
    if (error) throw error;
    revalidatePath("/nutrition");
    return { ok: true, message: "הפריט נשמר." };
  } catch {
    return { ok: false, message: "אחד או יותר מפרטי הארוחה אינם תקינים." };
  }
}

export async function deleteFreeMenuEntry(form: FormData) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return;
  const id = String(form.get("id") ?? "").trim();
  if (!UUID.test(id)) return;
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("delete_free_menu_entry", { p_entry_id: id });
  revalidatePath("/nutrition");
}
