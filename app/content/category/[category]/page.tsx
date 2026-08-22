import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import CinemaChrome from "@/components/client/CinemaChrome";
import { KindIcon, kindLabel } from "@/components/client/CinemaCard";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";
import {
  buildCourses,
  formatDuration,
  lessonThumbnail,
  mediaKind,
} from "@/lib/content/library";

export default async function ContentCoursePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const { category: slug } = await params;
  const [categories, lessons] = await Promise.all([
    listContentCategories(),
    listPublishedContent(auth.id, slug),
  ]);
  const course = buildCourses(categories, lessons).find(
    (entry) => entry.slug === slug,
  );
  if (!course) notFound();

  /* The source school groups its lessons into chapters, and that grouping rides
     along in each lesson's description. A course with a single chapter - most of
     them - gets no headings at all rather than one heading over everything. */
  const chapters = groupByChapter(course.lessons);
  const totalDuration = formatDuration(course.totalMinutes);

  return (
    <ClientShell className="cinema">
      <CinemaChrome />
      <section className="cinema-hero">
        <div className="cinema-hero__art">
          {course.coverUrl ? (
            <Image
              src={course.coverUrl}
              alt=""
              width={1920}
              height={1080}
              priority
              unoptimized
            />
          ) : null}
        </div>
        <div className="cinema-hero__body cinema-gutter">
          <Link href="/content" className="cinema-hero__eyebrow">
            <ArrowRight aria-hidden="true" size={15} />
            ספריית הקורסים
          </Link>
          <h1>{course.name}</h1>
          <p className="cinema-hero__meta">
            <span>{course.lessons.length} שיעורים</span>
            {totalDuration ? (
              <>
                <i aria-hidden="true">•</i>
                <span>{totalDuration}</span>
              </>
            ) : null}
            <i aria-hidden="true">•</i>
            <span>
              {course.completed} מתוך {course.lessons.length} הושלמו
            </span>
          </p>
          {course.description ? (
            <p className="cinema-hero__blurb">{course.description}</p>
          ) : null}
          <div className="cinema-hero__actions">
            <Link
              href={`/content/${course.resume.id}`}
              className="cinema-button cinema-button--play"
            >
              <Play aria-hidden="true" size={19} fill="currentColor" />
              {course.started ? "המשך צפייה" : "התחלת הקורס"}
            </Link>
          </div>
        </div>
      </section>

      <div className="cinema-gutter pb-10 pt-6">
        {chapters.map((chapter) => (
          <div key={chapter.title ?? "all"}>
            {chapter.title ? (
              <h2 className="cinema-chapter">{chapter.title}</h2>
            ) : null}
            <ul>
              {chapter.lessons.map((lesson) => {
                const kind = mediaKind(lesson);
                const art = lessonThumbnail(lesson, course.coverUrl);
                const duration = formatDuration(lesson.estimatedMinutes);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/content/${lesson.id}`}
                      className="cinema-episode"
                    >
                      <span className="cinema-episode__index">
                        {course.lessons.indexOf(lesson) + 1}
                      </span>
                      <span className="cinema-episode__art">
                        {art ? (
                          <Image
                            src={art}
                            alt=""
                            width={320}
                            height={180}
                            unoptimized
                          />
                        ) : null}
                        {lesson.progressPercent > 0 ? (
                          <span className="cinema-card__bar">
                            <span
                              style={{
                                width: `${Math.min(lesson.progressPercent, 100)}%`,
                              }}
                            />
                          </span>
                        ) : null}
                      </span>
                      <span className="cinema-episode__body">
                        <strong>{lesson.title}</strong>
                        <small>
                          {[kindLabel(kind), duration]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      <span className="cinema-episode__icon">
                        {lesson.progressPercent >= 100 ? (
                          <CheckCircle2 aria-label="הושלם" size={22} />
                        ) : (
                          <KindIcon kind={kind} size={22} />
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </ClientShell>
  );
}

function groupByChapter<T extends { description: string | null }>(
  lessons: readonly T[],
): { title: string | null; lessons: T[] }[] {
  const titles = [
    ...new Set(lessons.map((lesson) => lesson.description?.trim() || "")),
  ].filter(Boolean);
  if (titles.length < 2) return [{ title: null, lessons: [...lessons] }];
  return titles.map((title) => ({
    title,
    lessons: lessons.filter((lesson) => lesson.description?.trim() === title),
  }));
}
