import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Play } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import CinemaChrome from "@/components/client/CinemaChrome";
import LessonActions from "@/components/client/LessonActions";
import PdfViewer from "@/components/client/PdfViewer";
import { KindIcon, kindLabel } from "@/components/client/CinemaCard";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";
import {
  buildCourses,
  formatDuration,
  instagramEmbedUrl,
  lessonThumbnail,
  mediaKind,
  youtubeEmbedUrl,
} from "@/lib/content/library";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const { id } = await params;

  const [categories, items] = await Promise.all([
    listContentCategories(),
    listPublishedContent(auth.id),
  ]);
  const item = items.find((entry) => entry.id === id);
  if (!item) notFound();

  const course = buildCourses(categories, items).find(
    (entry) => entry.id === item.categoryId,
  );
  const siblings = course?.lessons ?? [item];
  const index = siblings.findIndex((entry) => entry.id === item.id);
  const next = index >= 0 ? siblings[index + 1] : undefined;

  const kind = mediaKind(item);
  const embed =
    kind === "youtube"
      ? youtubeEmbedUrl(item.mediaUrl)
      : kind === "instagram"
        ? instagramEmbedUrl(item.mediaUrl)
        : null;
  const duration = formatDuration(item.estimatedMinutes);
  const art = lessonThumbnail(item, course?.coverUrl);

  return (
    <ClientShell className="cinema">
      <CinemaChrome />
      {embed ? (
        <div className={`cinema-stage${kind === "instagram" ? " cinema-stage--instagram" : ""}`}>
          <iframe
            src={embed}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : art ? (
        <div className="cinema-stage">
          <Image
            src={art}
            alt=""
            width={1600}
            height={900}
            priority
            unoptimized
          />
        </div>
      ) : null}

      <div className="cinema-gutter pb-10 pt-5">
        <Link
          href={
            course
              ? `/content/category/${encodeURIComponent(course.slug)}`
              : "/content"
          }
          className="cinema-hero__eyebrow"
        >
          <ArrowRight aria-hidden="true" size={15} />
          {item.categoryName}
        </Link>
        <h1 className="mt-2 text-[1.65rem] font-black leading-[1.1] tracking-tight sm:text-4xl">
          {item.title}
        </h1>
        <p className="cinema-hero__meta mt-2">
          {index >= 0 ? (
            <span>
              שיעור {index + 1} מתוך {siblings.length}
            </span>
          ) : null}
          <i aria-hidden="true">•</i>
          <span>{kindLabel(kind)}</span>
          {duration ? (
            <>
              <i aria-hidden="true">•</i>
              <span>{duration}</span>
            </>
          ) : null}
        </p>

        {item.body ? (
          <div className="cinema-panel cinema-note mt-5">{item.body}</div>
        ) : null}

        {/* A guide opens in place. Anything else that cannot be framed - a shop
            listing, a shared document - is handed over, because there is nothing
            to gain from pretending to play it. A video we did embed needs
            neither. */}
        {kind === "pdf" && item.mediaUrl ? (
          <PdfViewer url={item.mediaUrl} title={item.title} />
        ) : item.mediaUrl && !embed ? (
          <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="cinema-button cinema-button--play mt-5 w-full"
          >
            <ExternalLink aria-hidden="true" size={19} />
            פתיחת הקישור
          </a>
        ) : null}

        {!item.mediaUrl && !item.body ? (
          <p className="cinema-empty mt-5">התוכן של השיעור עדיין לא זמין.</p>
        ) : null}

        <LessonActions
          contentItemId={item.id}
          watched={item.progressPercent >= 100}
          favorite={item.favorite}
          lastViewedLabel={
            item.lastViewedAt
              ? new Date(item.lastViewedAt).toLocaleString("he-IL", {
                  timeZone: "Asia/Jerusalem",
                })
              : undefined
          }
        />

        {next ? (
          <Link href={`/content/${next.id}`} className="cinema-episode mt-5">
            <span className="cinema-episode__index">
              <Play aria-hidden="true" size={18} />
            </span>
            <span className="cinema-episode__art">
              {lessonThumbnail(next, course?.coverUrl) ? (
                <Image
                  src={lessonThumbnail(next, course?.coverUrl)!}
                  alt=""
                  width={320}
                  height={180}
                  unoptimized
                />
              ) : null}
            </span>
            <span className="cinema-episode__body">
              <small>הבא בתור</small>
              <strong>{next.title}</strong>
            </span>
            <span className="cinema-episode__icon">
              <KindIcon kind={mediaKind(next)} size={22} />
            </span>
          </Link>
        ) : null}
      </div>
    </ClientShell>
  );
}
