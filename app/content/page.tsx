import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Info, Play } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { StateBlock } from "@/components/client/AppPatterns";
import CinemaChrome from "@/components/client/CinemaChrome";
import CinemaRail from "@/components/client/CinemaRail";
import CinemaCard, { LessonCard } from "@/components/client/CinemaCard";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";
import {
  buildCourses,
  continueWatching,
  courseCovers,
  favourites,
  formatDuration,
} from "@/lib/content/library";

export default async function ContentPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const [items, categories] = await Promise.all([
    listPublishedContent(auth.id),
    listContentCategories(),
  ]);
  const courses = buildCourses(categories, items);

  if (!courses.length) {
    return (
      <ClientShell>
        <StateBlock
          icon={<BookOpen aria-hidden="true" size={22} />}
          title="אין קורסים זמינים עדיין"
          description="קורסים שיפורסמו יופיעו כאן."
        />
      </ClientShell>
    );
  }

  const resuming = continueWatching(items);
  const list = favourites(items);
  const covers = courseCovers(categories);
  /* The banner is the course the client is already inside. Only when nothing is
     open does it fall back to the first course on the shelf - which is where a
     client who has never opened the library is meant to start anyway. */
  const featured =
    courses.find((course) => course.slug === resuming[0]?.categorySlug) ??
    courses.find((course) => course.started) ??
    courses[0];
  const featuredDuration = formatDuration(featured.totalMinutes);
  const featuredPercent = Math.round(
    (featured.completed / featured.lessons.length) * 100,
  );

  return (
    <ClientShell className="cinema">
      <CinemaChrome />
      <section className="cinema-hero">
        <div className="cinema-hero__art">
          {featured.coverUrl ? (
            <Image
              src={featured.coverUrl}
              alt=""
              width={1920}
              height={1080}
              priority
              unoptimized
            />
          ) : null}
        </div>
        <div className="cinema-hero__body cinema-gutter">
          <span className="cinema-hero__eyebrow">
            {featured.started ? "ממשיכים מאיפה שעצרת" : "מתחילים מכאן"}
          </span>
          <h1>{featured.name}</h1>
          <p className="cinema-hero__meta">
            <span>{featured.lessons.length} שיעורים</span>
            {featuredDuration ? (
              <>
                <i aria-hidden="true">•</i>
                <span>{featuredDuration}</span>
              </>
            ) : null}
            {featured.started ? (
              <>
                <i aria-hidden="true">•</i>
                <em>{featuredPercent}% הושלם</em>
              </>
            ) : null}
          </p>
          {featured.description ? (
            <p className="cinema-hero__blurb">{featured.description}</p>
          ) : null}
          <div className="cinema-hero__actions">
            <Link
              href={`/content/${featured.resume.id}`}
              className="cinema-button cinema-button--play"
            >
              <Play aria-hidden="true" size={20} fill="currentColor" />
              {featured.started ? "המשך צפייה" : "צפייה"}
            </Link>
            <Link
              href={`/content/category/${encodeURIComponent(featured.slug)}`}
              className="cinema-button cinema-button--ghost"
            >
              <Info aria-hidden="true" size={20} />
              עוד מידע
            </Link>
          </div>
        </div>
      </section>

      <div className="cinema-rails">
        {resuming.length ? (
          <CinemaRail title="להמשיך לצפות">
            {resuming.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                coverUrl={covers.get(lesson.categoryId)}
                priority={index < 3}
              />
            ))}
          </CinemaRail>
        ) : null}

        <CinemaRail title="הקורסים של אלי">
          {courses.map((course, index) => (
            <CinemaCard
              key={course.id}
              href={`/content/category/${encodeURIComponent(course.slug)}`}
              title={course.name}
              subtitle={[
                `${course.lessons.length} שיעורים`,
                formatDuration(course.totalMinutes),
              ]
                .filter(Boolean)
                .join(" · ")}
              artUrl={course.coverUrl}
              variant="course"
              badge={
                course.completed === course.lessons.length
                  ? { label: "הושלם", done: true }
                  : course.started
                    ? { label: `${course.completed}/${course.lessons.length}` }
                    : null
              }
              progressPercent={Math.round(
                (course.completed / course.lessons.length) * 100,
              )}
              priority={index < 3 && !resuming.length}
            />
          ))}
        </CinemaRail>

        {list.length ? (
          <CinemaRail title="הרשימה שלי">
            {list.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                coverUrl={covers.get(lesson.categoryId)}
              />
            ))}
          </CinemaRail>
        ) : null}

        {courses.map((course) => (
          <CinemaRail
            key={course.id}
            title={course.name}
            href={`/content/category/${encodeURIComponent(course.slug)}`}
          >
            {course.lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                coverUrl={course.coverUrl}
                episode={index + 1}
                showCourse={false}
              />
            ))}
          </CinemaRail>
        ))}
      </div>
    </ClientShell>
  );
}
