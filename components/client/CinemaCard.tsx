import Image from "next/image";
import Link from "next/link";
import { FileText, Film, Link2, Play, Video } from "lucide-react";
import type { ContentItemDto } from "@/lib/data/content-repository";
import {
  formatDuration,
  lessonThumbnail,
  mediaKind,
  type MediaKind,
} from "@/lib/content/library";

/* One card shape for the whole library, standing either for a course or for a
   single lesson. The caption sits over the foot of the artwork rather than in a
   panel beneath it, so a rail reads as a row of pictures instead of a row of
   labelled boxes - and the progress bar is drawn only once there is progress,
   because an empty bar under every card reads as a broken component. */
export default function CinemaCard({
  href,
  title,
  subtitle,
  artUrl,
  badge,
  progressPercent = 0,
  priority = false,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  artUrl?: string | null;
  badge?: { label: string; done?: boolean } | null;
  progressPercent?: number;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="cinema-card cinema-card--lesson">
      <span className="cinema-card__art">
        {artUrl ? (
          <Image
            src={artUrl}
            alt=""
            width={640}
            height={360}
            unoptimized
            priority={priority}
          />
        ) : (
          <span className="cinema-card__glyph">
            <Film aria-hidden="true" size={30} />
          </span>
        )}
      </span>
      {badge ? (
        <span
          className={`cinema-card__badge${badge.done ? " cinema-card__badge--done" : ""}`}
        >
          {badge.label}
        </span>
      ) : null}
      <span className="cinema-card__play" aria-hidden="true">
        <Play size={14} fill="currentColor" />
      </span>
      <span className="cinema-card__body">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      {progressPercent > 0 ? (
        <span className="cinema-card__bar">
          <span style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </span>
      ) : null}
    </Link>
  );
}

export function LessonCard({
  lesson,
  coverUrl,
  /* Inside a course rail every card wears the same banner, so the corner has to
     carry what tells them apart - which episode this is. Outside one, where the
     rail mixes courses, the corner is better spent saying what the lesson is. */
  episode,
  showCourse = true,
  priority = false,
}: {
  lesson: ContentItemDto;
  coverUrl?: string | null;
  episode?: number;
  showCourse?: boolean;
  priority?: boolean;
}) {
  const kind = mediaKind(lesson);
  const duration = formatDuration(lesson.estimatedMinutes);
  return (
    <CinemaCard
      href={`/content/${lesson.id}`}
      title={lesson.title}
      subtitle={[showCourse ? lesson.categoryName : null, duration]
        .filter(Boolean)
        .join(" · ")}
      artUrl={lessonThumbnail(lesson, coverUrl)}
      badge={
        lesson.progressPercent >= 100
          ? { label: "נצפה", done: true }
          : { label: episode ? `שיעור ${episode}` : kindLabel(kind) }
      }
      progressPercent={lesson.progressPercent}
      priority={priority}
    />
  );
}

export function kindLabel(kind: MediaKind): string {
  switch (kind) {
    case "youtube":
      return "וידאו";
    case "instagram":
      return "ריל";
    case "pdf":
      return "PDF";
    case "link":
      return "קישור";
    default:
      return "מאמר";
  }
}

export function KindIcon({ kind, size = 20 }: { kind: MediaKind; size?: number }) {
  const props = { "aria-hidden": true as const, size };
  switch (kind) {
    case "instagram":
      return <Video {...props} />;
    case "pdf":
      return <FileText {...props} />;
    case "link":
      return <Link2 {...props} />;
    case "text":
      return <FileText {...props} />;
    default:
      return <Play {...props} />;
  }
}
