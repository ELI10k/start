import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, ChevronLeft, CirclePlay, ClipboardCheck, LifeBuoy, LogOut, MessageSquare, Scale, UtensilsCrossed } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { getAuthContext } from "@/lib/data/product-repository";
import RequestProfileUpdate from "@/components/client/RequestProfileUpdate";
import DeleteAccountForm from "@/components/client/DeleteAccountForm";
import LegalLinks from "@/components/legal/LegalLinks";
import ProfileNutritionGoalsSheet from "@/components/client/ProfileNutritionGoalsSheet";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateEnergy, NUTRITION_GOALS } from "@/lib/nutrition/energy";
import { calculateMacroTargets } from "@/lib/nutrition/macro-targets";

export default async function ProfilePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const supabase = await createSupabaseServerClient();
  const [profileResult, { data: latest }] = await Promise.all([
    supabase.from("client_profiles").select("calorie_target,protein_target,carbohydrate_target,fat_target,nutrition_goal,age_years,sex,height,daily_steps,preferences").eq("user_id", auth.id).maybeSingle(),
    supabase.from("progress_entries").select("weight").eq("client_id", auth.id).not("weight", "is", null).order("date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const legacyProfileResult = profileResult.error?.code === "42703"
    ? await supabase.from("client_profiles").select("calorie_target,protein_target,nutrition_goal,age_years,sex,height,daily_steps,preferences").eq("user_id", auth.id).maybeSingle()
    : null;
  const profile = (legacyProfileResult?.data ?? profileResult.data) as (typeof profileResult.data & { carbohydrate_target?: number | null; fat_target?: number | null }) | null;
  const preferences = profile?.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences) ? profile.preferences as Record<string, unknown> : {};
  const recommendations = Object.fromEntries(NUTRITION_GOALS.flatMap((goal) => {
    const result = calculateEnergy({ ageYears: Number(profile?.age_years) || undefined, weightKg: Number(latest?.weight) || undefined, heightCm: Number(profile?.height) || undefined, sex: profile?.sex === "male" || profile?.sex === "female" ? profile.sex : undefined, dailySteps: Number(profile?.daily_steps) || undefined, weeklyWorkouts: Number(preferences.weekly_workouts) || undefined, goal });
    const macros = result.ok ? calculateMacroTargets(Number(latest?.weight), result.calorieTarget) : null;
    return result.ok && macros ? [[goal, { calories: result.calorieTarget, protein: macros.protein, carbohydrates: macros.carbohydrates, fat: macros.fat }]] : [];
  }));
  return (
    <ClientShell>
      <h1 className="sr-only">הפרופיל שלי</h1>
      <RequestProfileUpdate/>

      <h2 className="section-heading section-heading--compact mt-6">האפליקציה</h2>
      <div className="settings-group">
        <ProfileNutritionGoalsSheet goal={profile?.nutrition_goal ?? null} calorieTarget={profile?.calorie_target == null ? null : Number(profile.calorie_target)} proteinTarget={profile?.protein_target == null ? null : Number(profile.protein_target)} carbohydrateTarget={profile?.carbohydrate_target == null ? null : Number(profile.carbohydrate_target)} fatTarget={profile?.fat_target == null ? null : Number(profile.fat_target)} latestWeight={latest?.weight == null ? null : Number(latest.weight)} recommendations={recommendations} />
        <Link href="/my-meals">
          <span className="settings-group__label"><UtensilsCrossed aria-hidden="true" size={18} />הארוחות שלי</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/messages">
          <span className="settings-group__label"><MessageSquare aria-hidden="true" size={18} />הודעות עם המאמן</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/notifications">
          <span className="settings-group__label"><Bell aria-hidden="true" size={18} />התראות והעדפות</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/progress">
          <span className="settings-group__label"><Scale aria-hidden="true" size={18} />משקל ומדידות</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/check-in/history">
          <span className="settings-group__label"><ClipboardCheck aria-hidden="true" size={18} />היסטוריית צ׳ק־אין</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/content">
          <span className="settings-group__label"><BookOpen aria-hidden="true" size={18} />ספריית התוכן</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/support">
          <span className="settings-group__label"><LifeBuoy aria-hidden="true" size={18} />תמיכה</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/content/10000000-0000-4000-8000-000000000004">
          <span className="settings-group__label"><CirclePlay aria-hidden="true" size={18} />מדריך השימוש באפליקציה</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
      </div>

      <h2 className="section-heading section-heading--compact mt-6">חשבון</h2>
      <form action="/auth/logout" method="post" className="settings-group settings-group--danger">
        <button>
          <span className="settings-group__label"><LogOut aria-hidden="true" size={18} />התנתקות מהחשבון</span>
        </button>
      </form>

      <section className="mt-4 rounded-2xl border border-[#E5E7E5] bg-white p-4">
        <DeleteAccountForm />
      </section>

      <LegalLinks className="mt-8 pb-4" />
    </ClientShell>
  );
}
