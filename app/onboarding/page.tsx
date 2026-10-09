import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LegalLinks from "@/components/legal/LegalLinks";
import ClientOnboardingForm from "@/components/onboarding/ClientOnboardingForm";

// The client's own intake keeps the same calculable core as the coach's form,
// but derives professional programming choices so a new client is not asked to
// understand splits and exercise-selection rules before entering the product.
export default async function Onboarding() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/coach");
  const supabase = await createSupabaseServerClient();
  const { data: relationship } = await supabase
    .from("coach_client_relationships")
    .select("coach_id")
    .eq("client_id", auth.id)
    .eq("status", "active")
    .maybeSingle();
  if (relationship) redirect("/");

  return <main className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl">
    <form action="/auth/logout" method="post" className="flex justify-end">
      <button className="min-h-11 text-sm text-[#5B5F5B]">התנתקות</button>
    </form>

    <ClientOnboardingForm />
    <LegalLinks className="mt-8" />
  </div></main>;
}
