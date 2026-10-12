import { redirect } from "next/navigation";
import SetTestPasswordForm from "./SetTestPasswordForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SetTestPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=invite");
  const { data: profile } = await supabase.from("profiles").select("role,status,is_test_account").eq("id", user.id).maybeSingle();
  if (!profile?.is_test_account || profile.role !== "client" || profile.status !== "active") redirect("/unauthorized");
  return <main className="auth-screen"><section className="auth-card">
    <p className="auth-card__mark">LIFE FIT PREVIEW</p>
    <h1>בחירת סיסמת בדיקה</h1>
    <p className="auth-card__lead">הסיסמה נשמרת ישירות ב־Supabase staging ואינה נשלחת אלינו.</p>
    <SetTestPasswordForm />
  </section></main>;
}
