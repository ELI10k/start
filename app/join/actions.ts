"use server";

import { headers } from "next/headers";
import { siteUrlForRedirect } from "@/lib/auth/site-url";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBillingConfiguration } from "@/lib/billing/config";

export type JoinState = Readonly<{ status: "idle" | "sent" | "error"; message?: string }>;
const emailPattern = /^\S+@\S+\.\S+$/;

export async function requestDigitalInvitation(_: JoinState, form: FormData): Promise<JoinState> {
  if (!getBillingConfiguration().checkoutUrl) return { status: "error", message: "ההרשמה תיפתח מיד לאחר חיבור הסליקה." };
  const fullName = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (fullName.length < 2 || fullName.length > 100 || !emailPattern.test(email) || email.length > 254)
    return { status: "error", message: "יש להזין שם מלא וכתובת אימייל תקינה." };
  const inbound = await headers();
  const address = (inbound.get("x-forwarded-for")?.split(",")[0] ?? inbound.get("x-real-ip") ?? "").trim();
  // Do not limit an address by email: a customer may legitimately restart the
  // purchase flow or test it repeatedly. Keep only a generous network flood
  // ceiling so one automated source cannot generate unlimited auth emails.
  const addressAllowed = address
    ? await consumeRateLimit({ action: "digital_join_ip", subject: address, windowSeconds: 3_600, limit: 100 })
    : true;
  if (!addressAllowed) return { status: "error", message: "נשלחו יותר מדי בקשות. אפשר לנסות שוב מאוחר יותר." };
  try {
    const siteUrl = await siteUrlForRedirect();
    if (!siteUrl) throw new Error("site_url_missing");
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}/auth/callback?next=/billing/start`,
    });
    if (!error && data.user) {
      const { error: authorityError } = await admin.auth.admin.updateUserById(data.user.id, {
        app_metadata: { ...data.user.app_metadata, role: "client", acquisition: "self_service" },
      });
      if (authorityError) throw new Error("authority_update_failed");
    } else if (error?.message.toLowerCase().includes("already")) {
      // Invites are only delivered to new accounts. An existing customer who
      // restarts the Digital flow needs a sign-in link instead, otherwise this
      // action reports success while Supabase correctly sends no invitation.
      const supabase = await createSupabaseServerClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${siteUrl}/auth/confirm-link?next=${encodeURIComponent("/billing/start")}`,
        },
      });
      if (signInError) throw signInError;
    } else {
      throw error ?? new Error("invite_failed");
    }
    // Deliberately identical for existing and new addresses: this endpoint
    // must not disclose who already has a START account.
    return { status: "sent", message: "אם הכתובת מתאימה להרשמה, נשלח אליה קישור מאובטח להמשך." };
  } catch {
    return { status: "error", message: "לא ניתן להתחיל הרשמה כרגע. אפשר לנסות שוב בעוד כמה דקות." };
  }
}
