import { notFound, redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import Image from "next/image";
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
  const youtubeUrl = youtubeEmbedUrl(item.mediaUrl);
  return (
    <ClientShell>
      <PageHeader
        eyebrow={`${item.categoryName} · ${item.contentType === "video" ? "וידאו" : "מאמר"}`}
        title={item.title}
        description={item.description ?? ""}
      />
      {item.thumbnailUrl ? (
        <Image
          src={item.thumbnailUrl}
          alt={`תמונת ${item.title}`}
          width={1175}
          height={1080}
          priority
          unoptimized
          className="mb-5 max-h-[420px] w-full rounded-[24px] border border-[#E5E7E5] object-cover"
        />
      ) : null}
      {youtubeUrl ? (
        <div className="mb-5 overflow-hidden rounded-[24px] border border-[#E5E7E5] bg-black">
          <iframe
            src={youtubeUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      ) : null}
      {item.body ? (
        <article className="premium-card whitespace-pre-wrap leading-8">
          {item.body}
        </article>
      ) : null}
      {item.mediaUrl && !youtubeUrl ? (
        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="premium-primary-button w-full"
        >
          פתיחת המדיה
        </a>
      ) : !item.body && !youtubeUrl ? (
        <StateBlock
          icon={<BookOpen aria-hidden="true" size={22}/>}
          title="התוכן עדיין אינו זמין"
          description="הפריט פורסם אך לא צורף לו גוף או מדיה."
        />
      ) : null}
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

function youtubeEmbedUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const id = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
        : null;
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id)
      ? `https://www.youtube.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}
