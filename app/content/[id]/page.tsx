import { notFound, redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
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
        <article className="whitespace-pre-wrap rounded-[24px] border border-[#292929] bg-[#151515] p-6 leading-8">
          {item.body}
        </article>
      ) : item.mediaUrl ? (
        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center rounded-2xl bg-[#D4AF37] px-5 font-black text-black"
        >
          פתיחת המדיה
        </a>
      ) : (
        <p className="rounded-[24px] border border-dashed border-[#333] p-12 text-center text-zinc-500">
          התוכן עדיין אינו זמין.
        </p>
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
