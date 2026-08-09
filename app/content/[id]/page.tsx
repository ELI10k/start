import { notFound, redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { StateBlock } from "@/components/client/AppPatterns";
import ContentEngagement from "@/components/client/ContentEngagement";
import PageHeader from "@/components/client/PageHeader";
import { getAuthContext } from "@/lib/data/product-repository";
import { getPublishedContentItem } from "@/lib/data/content-repository";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const { id } = await params;
  const item = await getPublishedContentItem(id, auth.id);
  if (!item) notFound();
  return (
    <ClientShell>
      <PageHeader
        eyebrow={`${item.categoryName} · ${item.contentType === "video" ? "וידאו" : "מאמר"}`}
        title={item.title}
        description={item.description ?? ""}
      />
      {item.body ? (
        <article className="premium-card whitespace-pre-wrap leading-8">
          {item.body}
        </article>
      ) : item.mediaUrl ? (
        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="premium-primary-button w-full"
        >
          פתיחת המדיה
        </a>
      ) : (
        <StateBlock
          icon={<BookOpen aria-hidden="true" size={22}/>}
          title="התוכן עדיין אינו זמין"
          description="הפריט פורסם אך לא צורף לו גוף או מדיה."
        />
      )}
      <ContentEngagement
        contentItemId={item.id}
        initialProgress={item.progressPercent}
        favorite={item.favorite}
        lastViewedLabel={
          item.lastViewedAt
            ? new Date(item.lastViewedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
            : undefined
        }
      />
    </ClientShell>
  );
}
