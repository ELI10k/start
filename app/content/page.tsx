import Link from "next/link";
import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const category = (await searchParams).category;
  const [items, categories] = await Promise.all([
    listPublishedContent(auth.id, category),
    listContentCategories(),
  ]);
  return (
    <ClientShell>
      <PageHeader
        eyebrow="ספריית התוכן"
        title="תכנים מ־START"
        description="רק תכנים שפורסמו נטענים מ־Supabase."
      />
      <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none]">
        <Link
          href="/content"
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${!category ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#E7C85D]" : "border-[#333] text-zinc-400 hover:border-[#D4AF37]/50 hover:text-white"}`}
        >
          הכול
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={`/content?category=${encodeURIComponent(item.slug)}`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${category === item.slug ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#E7C85D]" : "border-[#333] text-zinc-400 hover:border-[#D4AF37]/50 hover:text-white"}`}
          >
            {item.name}
          </Link>
        ))}
      </div>
      {items.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className="start-surface group rounded-[24px] p-5 transition hover:-translate-y-1 hover:border-[#D4AF37]/50"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-[#D4AF37]">
                <span>{item.categoryName}</span>
                <span>{item.favorite ? "★ מועדף" : `${item.progressPercent}%`}</span>
              </div>
              <h2 className="mt-2 text-xl font-black group-hover:text-[#E7C85D]">{item.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                {item.estimatedMinutes && <span>{item.estimatedMinutes} דקות</span>}
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="start-empty mt-5 rounded-[24px] p-12 text-center"><h2 className="font-black text-white">אין כאן תוכן עדיין</h2><p className="mt-2 text-sm text-zinc-400">כשתוכן חדש יפורסם בקטגוריה הזו, הוא יופיע כאן.</p></div>
      )}
    </ClientShell>
  );
}
