"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { permanentlyDeleteOwnAccount } from "@/lib/account/delete-account";

export type DeleteAccountState = Readonly<{
  status: "idle" | "error" | "deleted";
  message: string;
}>;

export const initialDeleteAccountState: DeleteAccountState = { status: "idle", message: "" };

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
