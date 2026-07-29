import Link from "next/link";
import { redirect } from "next/navigation";
import { setContentItemStatus } from "@/app/actions/content";
import SubmitButton from "@/components/forms/SubmitButton";
import { getAuthContext } from "@/lib/data/product-repository";
import { listCoachContent } from "@/lib/data/content-repository";

const statusLabel = {
  draft: "טיוטה",
  published: "פורסם",
  archived: "הוסר",
};

export default async function CoachContentPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const items = await listCoachContent();
  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-[#D4AF37]">ספריית תוכן</p>
            <h1 className="mt-2 text-3xl font-black">ניהול תוכן</h1>
            <p className="mt-2 text-zinc-500">טיוטות, פרסום והסרה נשמרים ב־Supabase.</p>
          </div>
          <Link
            href="/coach/content/new"
            className="flex min-h-12 items-center rounded-2xl bg-[#D4AF37] px-5 font-black text-black"
          >
            תוכן חדש
          </Link>
        </header>
        {items.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-[#292929] bg-[#151515] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#D4AF37]">
                      {item.categoryName} · {statusLabel[item.status]}
                    </span>
                    <h2 className="mt-2 text-xl font-black">{item.title}</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      {item.description || "ללא תיאור"}
                    </p>
                  </div>
                  <Link
                    href={`/coach/content/${item.id}`}
                    className="shrink-0 rounded-xl border border-[#333] px-3 py-2 text-xs font-bold"
                  >
                    עריכה
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  {item.status !== "published" && (
                    <StatusForm id={item.id} status="published" label="פרסום" />
                  )}
                  {item.status !== "draft" && (
                    <StatusForm id={item.id} status="draft" label="החזרה לטיוטה" />
                  )}
                  {item.status !== "archived" && (
                    <StatusForm id={item.id} status="archived" label="הסרה" danger />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-[24px] border border-dashed border-[#333] p-12 text-center text-zinc-500">
            עדיין אין תוכן. אפשר ליצור את הרשומה הראשונה.
          </p>
        )}
      </div>
    </main>
  );
}

function StatusForm({
  id,
  status,
  label,
  danger = false,
}: {
  id: string;
  status: "draft" | "published" | "archived";
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={setContentItemStatus}>
      <input type="hidden" name="contentItemId" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        idle={label}
        pending="שומרים…"
        className={`min-h-10 rounded-xl border px-3 text-xs font-bold disabled:opacity-50 ${
          danger
            ? "border-red-400/25 text-red-300"
            : "border-[#4A3915] text-[#E7C85D]"
        }`}
      />
    </form>
  );
}
