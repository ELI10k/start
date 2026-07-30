import type { Metadata } from "next";
import { readSupabaseHealth } from "@/lib/supabase/health";

export const metadata: Metadata = {
  title: "START Backend",
};

export default async function SystemHealthPage() {
  const health = await readSupabaseHealth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
      <section
        aria-labelledby="backend-health-title"
        className="w-full rounded-2xl border border-amber-400/30 bg-black p-6 text-white shadow-xl"
      >
        <h1 id="backend-health-title" className="text-2xl font-bold text-amber-400">
          START Backend
        </h1>
        {health.connected ? (
          <p className="mt-4 text-lg" role="status">
            Supabase: Connected
          </p>
        ) : (
          <div className="mt-4" role="alert">
            <p className="text-lg">Supabase: Connection failed</p>
            <p className="mt-2 text-sm text-zinc-300">{health.message}</p>
            {health.detail ? (
              <p className="mt-2 text-sm text-zinc-400">{health.detail}</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
