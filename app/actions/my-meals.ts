"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MyMealActionState = Readonly<{ ok: boolean; message?: string }>;
const denied: MyMealActionState = { ok: false, message: "רק לקוח יכול לנהל את הארוחות שלו." };
const uuid = (value: FormDataEntryValue | null) => /^[0-9a-f-]{36}$/i.test(String(value ?? "")) ? String(value) : null;

export async function saveMyMeal(_: MyMealActionState, form: FormData): Promise<MyMealActionState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return denied;
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, message: "יש לתת לארוחה שם של עד 80 תווים." };
  let items: unknown;
  try { items = JSON.parse(String(form.get("items") ?? "[]")); }
  catch { return { ok: false, message: "רכיבי הארוחה אינם תקינים." }; }
  if (!Array.isArray(items) || items.length < 1 || items.length > 20)
    return { ok: false, message: "יש לבחור בין מאכל אחד ל־20 מאכלים." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_my_meal", { p_id: uuid(form.get("id")), p_name: name, p_items: items });
  if (error) {
    console.error("save_my_meal_failed", { code: error.code });
    return { ok: false, message: "הארוחה לא נשמרה. בדקו את הכמויות ונסו שוב." };
  }
  revalidatePath("/my-meals");
  return { ok: true, message: "הארוחה נשמרה." };
}

export async function deleteMyMeal(form: FormData) {
  const auth = await getAuthContext();
  const id = uuid(form.get("id"));
  if (!auth || auth.role !== "client" || !id) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_my_meal", { p_id: id });
  if (error) console.error("delete_my_meal_failed", { code: error.code });
  revalidatePath("/my-meals");
}

export async function duplicateMyMeal(form: FormData) {
  const auth = await getAuthContext();
  const id = uuid(form.get("id"));
  if (!auth || auth.role !== "client" || !id) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("duplicate_my_meal", { p_id: id });
  if (error) console.error("duplicate_my_meal_failed", { code: error.code });
  revalidatePath("/my-meals");
}

export async function addMyMealToDay(_: MyMealActionState, form: FormData): Promise<MyMealActionState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return denied;
  const id = uuid(form.get("id"));
  const targetMealId = uuid(form.get("targetMealId"));
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    return { ok: false, message: "התאריך או השעה אינם תקינים." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("add_my_meal_to_log", {
    p_id: id, p_date: date, p_time: time, p_target_meal_id: targetMealId,
  });
  if (error) {
    console.error("add_my_meal_to_log_failed", { code: error.code });
    return { ok: false, message: "לא הצלחנו לשייך את הארוחה. נסו שוב." };
  }
  revalidatePath("/nutrition");
  revalidatePath("/");
  revalidatePath("/my-meals");
  return { ok: true, message: `הארוחה שויכה עם ${Number(data) || 0} מאכלים.` };
}
