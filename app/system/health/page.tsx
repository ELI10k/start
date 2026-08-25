import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import { readSupabaseHealth } from "@/lib/supabase/health";

export const metadata: Metadata = {
  title: "START Backend",
};

// Signed-in only. The healthy branch says one word, but the failing branch
// prints the Postgres error code and message, which is operational detail about
// somebody else's database and not something an anonymous visitor is owed.
export default async function SystemHealthPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const health = await readSupabaseHealth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
      <section
        aria-labelledby="backend-health-title"
        className="w-full rounded-2xl border border-[#E5E7E5] bg-[#FFFFFF] p-6 text-[#0B0B0B] shadow-xl"
      >
        <h1 id="backend-health-title" className="text-2xl font-bold text-[#0B0B0B]">
          START Backend
        </h1>
        {health.connected ? (
          <p className="mt-4 text-lg" role="status">
            Supabase: Connected
          </p>
        ) : (
          <div className="mt-4" role="alert">
            <p className="text-lg">Supabase: Connection failed</p>
            <p className="mt-2 text-sm text-[#3F433F]">{health.message}</p>
            {health.detail ? (
              <p className="mt-2 text-sm text-[#5B5F5B]">{health.detail}</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
