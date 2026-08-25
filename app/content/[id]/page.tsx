import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, List, Play } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import CinemaChrome from "@/components/client/CinemaChrome";
import LessonActions from "@/components/client/LessonActions";
import LessonPlayer from "@/components/client/LessonPlayer";
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
  youtubeId,
  youtubeStart,
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
  const previous = index > 0 ? siblings[index - 1] : undefined;

  const kind = mediaKind(item);
  /* A video gets our own player, which shows none of YouTube's furniture. A reel
     keeps the plain frame - Instagram offers no such control, and a reel is a
     short vertical clip that nobody is going to scrub through anyway. */
  const video = kind === "youtube" && item.mediaUrl ? youtubeId(item.mediaUrl) : null;
  const embed = kind === "instagram" ? instagramEmbedUrl(item.mediaUrl) : null;
  const duration = formatDuration(item.estimatedMinutes);
  const art = lessonThumbnail(item, course?.coverUrl);

  return (
    <ClientShell className="cinema">
      <CinemaChrome />
      <div className="cinema-topgap" aria-hidden="true" />
      {video ? (
        <LessonPlayer
          contentItemId={item.id}
          videoId={video}
          title={item.title}
          posterUrl={art}
          startSeconds={youtubeStart(item.mediaUrl)}
        />
      ) : embed ? (
        <div className={`cinema-stage${kind === "instagram" ? " cinema-stage--instagram" : ""}`}>
          <iframe
            src={embed}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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

      {/* In a course you move forwards and backwards far more often than you go
          anywhere else, so the two neighbouring lessons sit directly under the
          player rather than at the foot of the page. A missing neighbour keeps
          its place as a disabled control, so the row does not reshuffle itself
          between the first lesson and the second. */}
      <nav className="cinema-steps cinema-gutter" aria-label="ניווט בין שיעורים">
        {previous ? (
          <Link href={`/content/${previous.id}`}>
            <ArrowRight aria-hidden="true" size={17} />
            הקודם
          </Link>
        ) : (
          <span aria-disabled="true">
            <ArrowRight aria-hidden="true" size={17} />
            הקודם
          </span>
        )}
        <Link
          href={
            course
              ? `/content/category/${encodeURIComponent(course.slug)}`
              : "/content"
          }
          className="cinema-steps__up"
        >
          <List aria-hidden="true" size={17} />
          {item.categoryName}
        </Link>
        {next ? (
          <Link href={`/content/${next.id}`}>
            הבא
            <ArrowLeft aria-hidden="true" size={17} />
          </Link>
        ) : (
          <span aria-disabled="true">
            הבא
            <ArrowLeft aria-hidden="true" size={17} />
          </span>
        )}
      </nav>

      <div className="cinema-gutter pb-10 pt-4">
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

        {/* A guide opens in place. A shop listing or a shared document is handed
            over, because there is nothing to gain from pretending to play it.
            Anything we do play - a video, a reel - needs neither, and testing
            the kind rather than the absence of an embed is what keeps this
            button off a lesson that is already playing. */}
        {kind === "pdf" && item.mediaUrl ? (
          <PdfViewer url={item.mediaUrl} title={item.title} />
        ) : kind === "link" && item.mediaUrl ? (
          /* Five lessons are a shop listing or a shared document - there is
             nothing to embed and nothing to play. They used to get a full-width
             green button, which read as the main action of the screen when it is
             the smallest thing on it, and it is the one control here that takes
             a client out of the app. It stays, because without it those five
             lessons are empty, but it is set as a quiet line of text. */
          <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="cinema-outlink"
          >
            <ExternalLink aria-hidden="true" size={16} />
            מעבר לקישור
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
