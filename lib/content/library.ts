import type {
  ContentCategoryDto,
  ContentItemDto,
} from "@/lib/data/content-repository";
// A relative path, not the `@/` alias: this module is loaded directly by the
// test runner, which resolves no alias, and the type-only import above erases.
import { courseArt } from "./course-art.ts";

/* The library holds four kinds of lesson, and the only thing that tells them
   apart is the address of the media. A YouTube video and an Instagram reel both
   play inside the app; a PDF and an outside link leave it. Everything on the
   screen - the badge on a card, the icon on a row, whether the lesson screen
   shows a player or a button - is decided from this one function. */
export type MediaKind = "youtube" | "instagram" | "pdf" | "link" | "text";

export function mediaKind(item: {
  mediaUrl: string | null;
  body: string | null;
}): MediaKind {
  const url = item.mediaUrl?.trim();
  if (!url) return "text";
  const host = safeHost(url);
  if (!host) return "link";
  if (isHost(host, "youtu.be") || isHost(host, "youtube.com")) return "youtube";
  if (isHost(host, "instagram.com")) return "instagram";
  if (new URL(url).pathname.toLowerCase().endsWith(".pdf")) return "pdf";
  return "link";
}

export function youtubeId(value: string): string | null {
  const url = safeUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const id =
    isHost(host, "youtu.be")
      ? url.pathname.split("/").filter(Boolean)[0]
      : isHost(host, "youtube.com")
        ? (url.searchParams.get("v") ??
          url.pathname.match(/^\/(?:embed|shorts|v)\/([^/]+)/)?.[1])
        : null;
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

/* The lesson is meant to feel like it lives here, not like a window onto a video
   site. What the embed can be told to drop, it drops: the related-video wall at
   the end, which would otherwise offer somebody else's channel inside a course
   the client paid for; the annotations; the keyboard-shortcut overlay; and the
   cookies, by going through youtube-nocookie.
   It also starts on arrival, so opening a lesson is watching a lesson rather
   than arriving at a play button. A browser that refuses to autoplay with sound
   - every phone does - simply shows the player ready to go, which is the same
   single tap as before and never a broken screen. */
export function youtubeEmbedUrl(
  value: string | null,
  { autoplay = false }: { autoplay?: boolean } = {},
): string | null {
  if (!value) return null;
  const id = youtubeId(value);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    playsinline: "1",
    color: "white",
  });
  // `start` carries a t=90s deep link through to the player.
  const start = startSeconds(value);
  if (start) params.set("start", String(start));
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/* The `t=90s` on a source lesson link, in seconds, so a player can open where
   the link points instead of restarting the video. */
export function youtubeStart(value: string | null): number {
  return (value ? startSeconds(value) : null) ?? 0;
}

export function instagramEmbedUrl(value: string | null): string | null {
  if (!value) return null;
  const url = safeUrl(value);
  if (!url || !isHost(url.hostname.toLowerCase(), "instagram.com")) return null;
  const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const kind = match[1] === "reels" ? "reel" : match[1];
  return `https://www.instagram.com/${kind}/${match[2]}/embed/captioned`;
}

/* Artwork for a lesson. A course has one banner and every lesson inside it wears
   that banner, so a rail reads as one course rather than as twenty unrelated
   stills - which is how a season of episodes is presented everywhere.
   The fallbacks behind it are for lessons whose course has no banner yet: the
   coach's own thumbnail, and failing that the video's still frame. YouTube
   serves `hqdefault` for every video ever uploaded - `maxresdefault` is missing
   on older ones - and its 4:3 frame is the 16:9 still with black bars, which a
   `cover` fit crops back off. */
export function lessonThumbnail(
  item: ContentItemDto,
  courseCover?: string | null,
): string | null {
  if (courseCover) return courseCover;
  if (item.thumbnailUrl) return item.thumbnailUrl;
  const id = item.mediaUrl ? youtubeId(item.mediaUrl) : null;
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/* The banner of each course, keyed by the id every lesson already carries, so a
   flat list of lessons - the continue rail, the list rail - can dress each one
   in the artwork of the course it came from. */
export function courseCovers(
  categories: readonly ContentCategoryDto[],
): Map<string, string | null> {
  return new Map(
    categories.map((category) => [
      category.id,
      category.coverUrl ?? courseArt(category.slug),
    ]),
  );
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes < 1) return null;
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} שע׳ ${rest} דק׳` : `${hours} שעות`;
}

export type Course = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  lessons: readonly ContentItemDto[];
  completed: number;
  totalMinutes: number;
  /* The lesson the client should land on: the first one they have not
     finished, or the first lesson of all if the course is complete. */
  resume: ContentItemDto;
  started: boolean;
}>;

export function buildCourses(
  categories: readonly ContentCategoryDto[],
  items: readonly ContentItemDto[],
): Course[] {
  return categories.flatMap((category) => {
    const lessons = items.filter((item) => item.categoryId === category.id);
    if (!lessons.length) return [];
    const completed = lessons.filter((item) => item.progressPercent >= 100);
    return [
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        coverUrl:
          category.coverUrl ?? courseArt(category.slug) ?? lessonThumbnail(lessons[0]),
        lessons,
        completed: completed.length,
        totalMinutes: lessons.reduce(
          (total, item) => total + (item.estimatedMinutes ?? 0),
          0,
        ),
        resume:
          lessons.find((item) => item.progressPercent < 100) ?? lessons[0],
        started: lessons.some((item) => item.progressPercent > 0),
      },
    ];
  });
}

/* Netflix opens on the thing you were in the middle of, and so does this: the
   rail is ordered by when the client last looked at something, not by where the
   lesson sits in its course. A finished lesson drops out of it. */
export function favourites(
  items: readonly ContentItemDto[],
): ContentItemDto[] {
  return items.filter((item) => item.favorite);
}

export function continueWatching(
  items: readonly ContentItemDto[],
): ContentItemDto[] {
  return items
    .filter(
      (item) =>
        item.lastViewedAt !== null &&
        item.progressPercent > 0 &&
        item.progressPercent < 100,
    )
    .sort((a, b) => (a.lastViewedAt! < b.lastViewedAt! ? 1 : -1))
    .slice(0, 12);
}

/* `endsWith` is not a domain test: it says yes to notyoutube.com, and an
   attacker-chosen host would then be framed as though it were a lesson. Only the
   domain itself and its subdomains count. */
function isHost(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function safeHost(value: string): string | null {
  return safeUrl(value)?.hostname.toLowerCase() ?? null;
}

function startSeconds(value: string): number | null {
  const raw = safeUrl(value)?.searchParams.get("t");
  if (!raw) return null;
  const match = raw.match(/^(\d+)s?$/);
  const seconds = match ? Number(match[1]) : NaN;
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null;
}
