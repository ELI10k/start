import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { StateBlock } from "@/components/client/AppPatterns";
import CinemaChrome from "@/components/client/CinemaChrome";
import CoursePicker from "@/components/client/CoursePicker";
import CinemaRail from "@/components/client/CinemaRail";
import { LessonCard } from "@/components/client/CinemaCard";
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

  return (
    <ClientShell className="cinema">
      <CinemaChrome />
      <div className="cinema-topgap" aria-hidden="true" />
      <CoursePicker
        courses={courses.map((course) => ({
          slug: course.slug,
          name: course.name,
          lessons: course.lessons.length,
        }))}
      />
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
            id={`course-${course.slug}`}
            title={course.name}
            description={course.description}
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
