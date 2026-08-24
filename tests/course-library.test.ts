import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildCourses,
  continueWatching,
  courseCovers,
  favourites,
  formatDuration,
  instagramEmbedUrl,
  lessonThumbnail,
  mediaKind,
  youtubeEmbedUrl,
  youtubeStart,
} from "../lib/content/library.ts";
import type {
  ContentCategoryDto,
  ContentItemDto,
} from "../lib/data/content-repository.ts";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const category = (over: Partial<ContentCategoryDto> = {}): ContentCategoryDto => ({
  id: "cat-1",
  name: "תזונה",
  slug: "nutrition-course",
  description: null,
  coverUrl: "/content/courses/nutrition/cover.jpg",
  sortOrder: 20,
  active: true,
  ...over,
});

const lesson = (over: Partial<ContentItemDto> = {}): ContentItemDto => ({
  id: "lesson-1",
  title: "חלבון",
  description: "פרק 1",
  categoryId: "cat-1",
  categoryName: "תזונה",
  categorySlug: "nutrition-course",
  contentType: "video",
  thumbnailUrl: null,
  body: null,
  mediaUrl: "https://www.youtube.com/watch?v=CDkr5wnZ9Wo",
  status: "published",
  sortOrder: 10,
  estimatedMinutes: 5,
  publishedAt: null,
  updatedAt: "2026-08-22T00:00:00.000Z",
  tags: [],
  progressPercent: 0,
  lastViewedAt: null,
  favorite: false,
  ...over,
});

test("a lesson is classified by where its media lives", () => {
  assert.equal(mediaKind(lesson()), "youtube");
  assert.equal(mediaKind(lesson({ mediaUrl: "https://youtu.be/GOM569xgTTM" })), "youtube");
  assert.equal(
    mediaKind(lesson({ mediaUrl: "https://www.instagram.com/reel/CwKZWlQITXa/" })),
    "instagram",
  );
  assert.equal(
    mediaKind(lesson({ mediaUrl: "https://my.schooler.biz/system/lessons/a.pdf?1722330487" })),
    "pdf",
  );
  assert.equal(mediaKind(lesson({ mediaUrl: "https://il.iherb.com/pr/x/22708" })), "link");
  assert.equal(mediaKind(lesson({ mediaUrl: null, body: "טקסט" })), "text");
});

test("only the two embeddable kinds produce a player", () => {
  // Cookie-free host, no related-video wall, no annotations - the lesson should
  // not look like a window onto somebody else's video site.
  const embed = youtubeEmbedUrl("https://www.youtube.com/watch?v=CDkr5wnZ9Wo");
  assert.match(embed!, /^https:\/\/www\.youtube-nocookie\.com\/embed\/CDkr5wnZ9Wo\?/);
  for (const param of ["rel=0", "modestbranding=1", "iv_load_policy=3", "playsinline=1"]) {
    assert.match(embed!, new RegExp(param.replace("=", "=")));
  }
  // Nothing autoplays unless the screen asks for it.
  assert.equal(/autoplay/.test(embed!), false);
  assert.match(
    youtubeEmbedUrl("https://youtu.be/GOM569xgTTM", { autoplay: true })!,
    /autoplay=1/,
  );
  // A deep link keeps its offset rather than restarting the lesson.
  assert.match(
    youtubeEmbedUrl("https://www.youtube.com/watch?v=NyMB2mJ7UnI&t=4s")!,
    /start=4/,
  );
  assert.equal(
    instagramEmbedUrl("https://www.instagram.com/p/CvAjPCTIFZ9/"),
    "https://www.instagram.com/p/CvAjPCTIFZ9/embed/captioned",
  );
  assert.equal(
    instagramEmbedUrl("https://www.instagram.com/reel/CwKZWlQITXa/?utm_source=ig_web"),
    "https://www.instagram.com/reel/CwKZWlQITXa/embed/captioned",
  );
  assert.equal(youtubeEmbedUrl("https://il.iherb.com/pr/x/22708"), null);
  assert.equal(instagramEmbedUrl("https://il.iherb.com/pr/x/22708"), null);
  // A host that merely ends in a lookalike domain is not YouTube.
  assert.equal(youtubeEmbedUrl("https://notyoutube.com/watch?v=CDkr5wnZ9Wo"), null);
});

test("every lesson wears the banner of the course it belongs to", () => {
  const cover = "/content/courses/nutrition/cover.jpg";
  // The course banner outranks both the stored thumbnail and the video still.
  assert.equal(lessonThumbnail(lesson({ thumbnailUrl: "/a.png" }), cover), cover);
  assert.equal(lessonThumbnail(lesson({ thumbnailUrl: null }), cover), cover);
  // A course with no banner falls back, so no lesson is ever left blank.
  assert.equal(lessonThumbnail(lesson({ thumbnailUrl: "/a.png" }), null), "/a.png");
  assert.equal(
    lessonThumbnail(lesson({ thumbnailUrl: null })),
    "https://img.youtube.com/vi/CDkr5wnZ9Wo/hqdefault.jpg",
  );
  assert.equal(
    lessonThumbnail(lesson({ thumbnailUrl: null, mediaUrl: "https://x.test/a.pdf" })),
    null,
  );
});

test("a flat rail can still find each lesson's course banner", () => {
  const covers = courseCovers([
    category({ id: "cat-1", coverUrl: "/a.jpg" }),
    // A course the coach added himself: no banner in the row, none shipped.
    category({ id: "cat-2", slug: "coach-course", coverUrl: null }),
  ]);
  assert.equal(covers.get("cat-1"), "/a.jpg");
  assert.equal(covers.get("cat-2"), null);
  assert.equal(covers.get("cat-9"), undefined);
});

test("a course carries its own progress and resumes where the client stopped", () => {
  const lessons = [
    lesson({ id: "a", sortOrder: 10, progressPercent: 100, estimatedMinutes: 5 }),
    lesson({ id: "b", sortOrder: 20, progressPercent: 40, estimatedMinutes: 6 }),
    lesson({ id: "c", sortOrder: 30, progressPercent: 0, estimatedMinutes: null }),
  ];
  const [course] = buildCourses([category()], lessons);
  assert.equal(course.lessons.length, 3);
  assert.equal(course.completed, 1);
  assert.equal(course.totalMinutes, 11);
  assert.equal(course.resume.id, "b");
  assert.equal(course.started, true);
  assert.equal(course.coverUrl, "/content/courses/nutrition/cover.jpg");
});

test("a course whose lessons are all finished resumes at its first lesson", () => {
  const [course] = buildCourses(
    [category()],
    [
      lesson({ id: "a", progressPercent: 100 }),
      lesson({ id: "b", progressPercent: 100 }),
    ],
  );
  assert.equal(course.resume.id, "a");
  assert.equal(course.completed, 2);
});

test("a category with no published lesson never reaches the shelf", () => {
  assert.deepEqual(buildCourses([category()], []), []);
});

test("the continue rail is ordered by the last look, and drops what is finished", () => {
  const rail = continueWatching([
    lesson({ id: "old", progressPercent: 30, lastViewedAt: "2026-08-01T10:00:00Z" }),
    lesson({ id: "new", progressPercent: 70, lastViewedAt: "2026-08-20T10:00:00Z" }),
    lesson({ id: "done", progressPercent: 100, lastViewedAt: "2026-08-21T10:00:00Z" }),
    lesson({ id: "untouched", progressPercent: 0, lastViewedAt: null }),
  ]);
  assert.deepEqual(rail.map((item) => item.id), ["new", "old"]);
});

test("the list rail holds exactly what the client marked", () => {
  const list = favourites([
    lesson({ id: "a", favorite: true }),
    lesson({ id: "b", favorite: false }),
    lesson({ id: "c", favorite: true }),
  ]);
  assert.deepEqual(list.map((item) => item.id), ["a", "c"]);
});

test("durations read as Hebrew, and nothing is claimed for a lesson without one", () => {
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(9), "9 דק׳");
  assert.equal(formatDuration(60), "1 שעות");
  assert.equal(formatDuration(95), "1 שע׳ 35 דק׳");
});

test("the import carries every course and lesson of the source school", async () => {
  const [courses, lessons] = await Promise.all([
    file("supabase/migrations/202608220002_schooler_course_library.sql"),
    file("supabase/migrations/202608220003_schooler_lessons.sql"),
  ]);
  assert.match(courses, /add column if not exists cover_url/);
  for (const slug of [
    "weight-basics",
    "nutrition-course",
    "training-course",
    "sleep-science",
    "body-type",
    "mindset-habits",
    "guides",
    "nutrition-qa",
    "training-qa",
    "podcast",
  ]) {
    assert.match(courses, new RegExp(`'${slug}'`), `missing course ${slug}`);
  }
  // EAT 2 arrived earlier and is placed rather than re-created.
  assert.match(courses, /where slug = 'eat-2'/);

  const rows = lessons.split("\n").filter((line) => /^ {2}\('/.test(line));
  assert.equal(rows.length, 90);
  // Its three lessons keep the ids client progress already points at.
  for (const id of ["041", "042", "043"]) {
    assert.match(lessons, new RegExp(`30000000-0000-4000-8000-000000000${id}`));
  }
  assert.match(lessons, /body = coalesce\(excluded\.body, public\.content_items\.body\)/);
  assert.equal(/'draft'/.test(lessons), false);
});

test("the scaffolding courses leave the shelf without losing their rows", async () => {
  const cleanup = await file(
    "supabase/migrations/202608220004_library_shelf_cleanup.sql",
  );
  assert.match(cleanup, /set active = false/);
  for (const slug of ["start-guide", "habits-progress", "nutrition-training"]) {
    assert.match(cleanup, new RegExp(`'${slug}'`));
  }
  // Deactivated, never deleted: progress and favourites point at these rows.
  assert.equal(/delete from public\.content_(categories|items)/.test(cleanup), false);
  // And every lesson without a still frame inherits its course's artwork.
  assert.match(cleanup, /set thumbnail_url = c\.cover_url/);
});

test("a guide opens inside the library, with the file still one tap away", async () => {
  const [page, viewer] = await Promise.all([
    file("app/content/[id]/page.tsx"),
    file("components/client/PdfViewer.tsx"),
  ]);
  // A PDF no longer leaves for the school that stores it.
  assert.match(page, /kind === "pdf" && item\.mediaUrl \? \(\s*<PdfViewer/);
  assert.equal(/הורדת הקובץ/.test(page), false);
  // Seventeen megabytes are not spent before the client asks for them.
  assert.match(viewer, /useState\(false\)/);
  assert.match(viewer, /\{open \? \(\s*<object/);
  // And the link out survives, for a browser that will not frame a PDF at all.
  assert.match(viewer, /target="_blank"/);
});

test("a course keeps its banner even if the database column is empty", async () => {
  const [course] = buildCourses(
    [category({ slug: "sleep-science", coverUrl: null })],
    [lesson({ thumbnailUrl: null })],
  );
  // Not the first lesson's video still: the course's own artwork.
  assert.equal(course.coverUrl, "/content/courses/sleep-science/cover.jpg");

  const covers = courseCovers([
    category({ id: "cat-1", slug: "guides", coverUrl: null }),
  ]);
  assert.equal(covers.get("cat-1"), "/content/courses/guides/cover.png");
});

test("every course on the shelf has artwork that ships with the app", async () => {
  const { COURSE_ART } = await import("../lib/content/course-art.ts");
  const migration = await file(
    "supabase/migrations/202608220002_schooler_course_library.sql",
  );
  const slugs = Object.keys(COURSE_ART);
  assert.equal(slugs.length, 11);
  for (const [slug, path] of Object.entries(COURSE_ART)) {
    // The file is really in the bundle, and the database agrees on the path.
    await readFile(new URL(`../public${path}`, import.meta.url));
    if (slug !== "eat-2") assert.match(migration, new RegExp(`'${slug}'`));
  }
});

test("the courses rail is gone, and nothing still refers to it", async () => {
  const [page, card, css] = await Promise.all([
    file("app/content/page.tsx"),
    file("components/client/CinemaCard.tsx"),
    file("app/globals.css"),
  ]);
  // Every course has a row of its own and the bar reaches all eleven, so a
  // shelf of course cards was one route too many.
  assert.equal(/הקורסים של אלי/.test(page), false);
  // And the card treatment built for it left with it, rather than staying as a
  // branch nothing takes.
  assert.equal(/variant/.test(card), false);
  assert.equal(/cinema-card--course/.test(css), false);
});

test("a course name is set to be read, not tucked against the edge", async () => {
  const css = await file("app/globals.css");
  const head = css.match(/\.cinema-rail__head \{[^}]*\}/s)?.[0] ?? "";
  assert.match(head, /justify-content: center/);
  assert.match(head, /text-align: center/);
  // Large enough to carry a course, not a section label.
  assert.match(css, /\.cinema-rail__head h2 \{[^}]*font-size: clamp\(1\.35rem/s);
});
test("the navigation bar sits at the top and clears the app header", async () => {
  const [page, picker, css] = await Promise.all([
    file("app/content/page.tsx"),
    file("components/client/CoursePicker.tsx"),
    file("app/globals.css"),
  ]);
  // Above the artwork, not revealed by scrolling past it.
  assert.match(page, /<CoursePicker[\s\S]*?\/>\s*<section className="cinema-hero">/);
  const bar = css.match(/\.cinema-picker \{[^}]*\}/s)?.[0] ?? "";
  assert.match(bar, /position: sticky/);
  assert.match(bar, /inset-block-start: var\(--cine-headroom\)/);
  // The headroom is padding that the sticky bar gives back, so it cannot travel
  // down the page as a band of empty black.
  assert.match(bar, /margin-block-start: calc\(var\(--cine-headroom\) \* -1\)/);
  // And it carries the way back, which a home-screen app has no chrome for.
  assert.match(picker, /router\.back\(\)/);
  assert.match(picker, /router\.forward\(\)/);
  assert.match(picker, /aria-label="חזרה"/);
});
test("the library carries a navigator to every course row", async () => {
  const [page, picker, rail] = await Promise.all([
    file("app/content/page.tsx"),
    file("components/client/CoursePicker.tsx"),
    file("components/client/CinemaRail.tsx"),
  ]);
  // Each course row is addressable, and the picker jumps to that address.
  assert.match(rail, /<section className="cinema-rail" id=\{id\}>/);
  assert.match(page, /id=\{`course-\$\{course\.slug\}`\}/);
  assert.match(picker, /getElementById\(`course-\$\{slug\}`\)/);
  // It closes on Escape and on a click outside, like any other menu.
  assert.match(picker, /event\.key === "Escape"/);
  assert.match(picker, /root\.current\?\.contains/);
  assert.match(picker, /aria-haspopup="listbox"/);
});

test("captions stay readable on top of bright banner artwork", async () => {
  const css = await file("app/globals.css");
  // A lesson caption sits on its own dark plate, not on a gradient that only
  // works when the picture underneath is dark.
  assert.match(css, /\.cinema-card--lesson \.cinema-card__body \{[^}]*background: rgba\(6, 6, 8, \.82\)/s);
  // And a chapter heading is a black pill rather than loose white type.
  assert.match(css, /\.cinema-chapter \{[^}]*border-radius: 999px;[^}]*background: #000000;/s);
});

test("opening a lesson starts it playing", async () => {
  // The lesson page no longer builds an embed URL for video - our own player
  // does, and it autoplays on the press rather than on arrival. What still has
  // to hold is that autoplay is permitted wherever a frame is used, or the
  // parameter is silently ignored.
  const [page, player] = await Promise.all([
    file("app/content/[id]/page.tsx"),
    file("components/client/LessonPlayer.tsx"),
  ]);
  assert.match(page, /allow="[^"]*autoplay[^"]*"/);
  assert.match(player, /allow="[^"]*autoplay[^"]*"/);
  assert.match(player, /autoplay: 1/);
});

test("a lesson video is played by us, not handed to YouTube", async () => {
  const [player, page] = await Promise.all([
    file("components/client/LessonPlayer.tsx"),
    file("app/content/[id]/page.tsx"),
  ]);
  // The page hands a video to our player; only a reel keeps a bare frame.
  assert.match(page, /const video =\s*kind === "youtube"/);
  assert.match(page, /<LessonPlayer/);
  // No YouTube controls, branding, keyboard, end screen or related grid.
  for (const off of ["controls: 0", "modestbranding: 1", "rel: 0", "iv_load_policy: 3", "disablekb: 1"]) {
    assert.ok(player.includes(off), `player must set ${off}`);
  }
  // It starts on the press, and the frame can never be clicked through.
  assert.match(player, /autoplay: 1/);
  assert.match(player, /cinema-player__surface/);
  // Nothing reaches Google until the client actually asks to watch.
  assert.match(player, /if \(!started \|\| !mount\.current\) return;/);
  // Watching it through is what marks it watched.
  assert.match(player, /current \/ total >= 0\.95/);
});

test("a deep-linked lesson opens where the link points", () => {
  assert.equal(youtubeStart("https://www.youtube.com/watch?v=NyMB2mJ7UnI&t=4s"), 4);
  assert.equal(youtubeStart("https://www.youtube.com/watch?v=NyMB2mJ7UnI"), 0);
  assert.equal(youtubeStart(null), 0);
});

test("a lesson that plays is never also offered as a link to somewhere else", async () => {
  const page = await file("app/content/[id]/page.tsx");
  /* The outbound link is chosen by what the lesson IS, not by whether an embed
     happened to be built. Testing `!embed` put a "leave the app" link on every
     video the moment the video branch stopped producing one. */
  assert.match(page, /\) : kind === "link" && item\.mediaUrl \? \(/);
  assert.equal(/item\.mediaUrl && !embed/.test(page), false);
});

test("the lesson screen starts below the header and carries its neighbours", async () => {
  const [page, css] = await Promise.all([
    file("app/content/[id]/page.tsx"),
    file("app/globals.css"),
  ]);
  // The header floats over artwork everywhere else; over a player it covers it.
  assert.match(page, /<div className="cinema-topgap" aria-hidden="true" \/>/);
  // The clearance is the header's own height, taken from the shared token
  // rather than restated - one number, one place to change it.
  assert.match(css, /\.cinema-topgap \{ height: var\(--cine-headroom\); \}/);
  // And it gets out of the way in fullscreen, where the header is hidden and
  // the gap would otherwise sit as a black band above the picture.
  assert.match(
    css,
    /body:has\(\.cinema-player\[data-full="true"\]\) \.cinema-topgap \{ display: none; \}/,
  );
  // Previous and next hold their place even when there is no neighbour.
  assert.match(page, /aria-label="ניווט בין שיעורים"/);
  assert.match(page, /const previous = index > 0 \? siblings\[index - 1\] : undefined;/);
  assert.match(page, /<span aria-disabled="true">/);
});

test("fullscreen asks the browser first and never rotates the picture", async () => {
  const [player, css] = await Promise.all([
    file("components/client/LessonPlayer.tsx"),
    file("app/globals.css"),
  ]);
  /* This test used to assert the opposite of both halves - never call
     requestFullscreen, and rotate the player in CSS instead. A screenshot from
     Eli's phone disproved both at once: the browser's own address bar and side
     buttons stayed on top of the lesson, because only native fullscreen can
     move those; and the picture lay on its side, because he had turned the
     handset, the page had turned with it, and our rotation had compounded. */
  assert.match(player, /stage\.current\?\.requestFullscreen\?\.\(\)/);
  assert.equal(/rotate\(-90deg\)/.test(css), false);

  // Still exactly one implementation, and the CSS layer still stands in where
  // native fullscreen is refused - which on iOS Safari is always.
  assert.equal(/theatre|expanded/.test(player), false);
  assert.match(player, /data-full=\{full\}/);
  assert.match(css, /\.cinema-player\[data-full="true"\] \{[^}]*position: fixed/s);

  // Leaving by the browser's own gesture puts the page back.
  assert.match(player, /addEventListener\("fullscreenchange", sync\)/);
  // The app's own chrome gets out of the way with it.
  assert.match(css, /body:has\(\.cinema-player\[data-full="true"\]\)/);
  // A portrait phone letterboxes the lesson rather than cropping its sides.
  assert.match(css, /\.cinema-player\[data-full="true"\] \.cinema-player__frame \{[^}]*aspect-ratio: 16 \/ 9/s);
});
