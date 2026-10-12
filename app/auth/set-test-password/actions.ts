"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SetTestPasswordState = Readonly<{ error?: string }>;

export async function setTestPassword(_: SetTestPasswordState, form: FormData): Promise<SetTestPasswordState> {
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (password.length < 12) return { error: "הסיסמה חייבת להכיל לפחות 12 תווים." };
  if (password !== confirmation) return { error: "הסיסמאות אינן זהות." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "קישור ההזמנה פג. יש לבקש הזמנה חדשה." };
  const { data: profile } = await supabase.from("profiles").select("role,status,is_test_account").eq("id", user.id).maybeSingle();
  if (!profile?.is_test_account || profile.role !== "client" || profile.status !== "active")
    return { error: "הגדרת סיסמה זמינה רק לחשבון בדיקה פעיל." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "לא הצלחנו לשמור את הסיסמה. אפשר לנסות שוב." };
  redirect("/");
}
