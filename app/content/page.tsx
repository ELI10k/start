import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Star } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { StateBlock } from "@/components/client/AppPatterns";
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
  const active = categories.find((item) => item.slug === category);

  return (
    <ClientShell>
      <PageHeader
        eyebrow="ספריית התוכן"
        title="תכנים מ־START"
        description="רק תכנים שפורסמו נטענים מ־Supabase."
      />

      {/* Category chips scroll rather than wrapping into a block that pushes the
          library itself off the first screen. */}
      <nav className="chip-row" aria-label="קטגוריות תוכן">
        <Link href="/content" className="chip" aria-current={!category ? "page" : undefined}>הכול</Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={`/content?category=${encodeURIComponent(item.slug)}`}
            className="chip"
            aria-current={category === item.slug ? "page" : undefined}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/content/${item.id}`} className="premium-card content-card">
              <div className="content-card__head">
                <span className="pill pill--green">{item.categoryName}</span>
                {item.favorite
                  ? <span className="pill"><Star aria-hidden="true" size={13}/>מועדף</span>
                  : <span className="pill">{item.progressPercent}%</span>}
              </div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              {/* Progress belongs on the card, not only in the corner number. */}
              <div className="premium-progress__track" role="img" aria-label={`${item.progressPercent} אחוז נצפה`}>
                <span style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }}/>
              </div>
              <div className="content-card__meta">
                {item.estimatedMinutes && <span>{item.estimatedMinutes} דקות</span>}
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <StateBlock
          icon={<BookOpen aria-hidden="true" size={22}/>}
          title={active ? `אין עדיין תוכן ב${active.name}` : "אין כאן תוכן עדיין"}
          description="כשתוכן חדש יפורסם בקטגוריה הזו, הוא יופיע כאן."
          action={active ? <Link href="/content" className="premium-secondary-button">כל התכנים</Link> : undefined}
        />
      )}
    </ClientShell>
  );
}
