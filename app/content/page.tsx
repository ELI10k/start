import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";

export default async function ContentPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const [items, categories] = await Promise.all([
    listPublishedContent(auth.id),
    listContentCategories(),
  ]);
  const courses = categories.flatMap((category) => {
    const lessons = items.filter((item) => item.categoryId === category.id);
    if (!lessons.length) return [];
    const completed = lessons.filter((item) => item.progressPercent >= 100).length;
    return [{
      ...category,
      lessons,
      completed,
      thumbnailUrl: lessons.find((item) => item.thumbnailUrl)?.thumbnailUrl ?? null,
    }];
  });

  return (
    <ClientShell className="bg-[#090B09] text-white">
      <PageHeader
        eyebrow="ספריית התוכן"
        title="הקורסים של START"
        description="כל קורס מרוכז במקום אחד, עם השיעורים והקבצים לפי הסדר."
      />

      {courses.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/content/category/${encodeURIComponent(course.slug)}`}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#151815] shadow-2xl shadow-black/30 transition-transform hover:-translate-y-1"
            >
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={`תמונת הקורס ${course.name}`}
                  width={900}
                  height={540}
                  priority={courses.indexOf(course) < 3}
                  unoptimized
                  className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-[#183D24] via-[#101C13] to-black text-[#4ADE80]">
                  <BookOpen aria-hidden="true" size={34} />
                </div>
              )}
              <div className="p-5">
                <span className="pill pill--green">קורס</span>
                <h2 className="mt-3 text-xl font-black">{course.name}</h2>
                {course.description ? (
                  <p className="mt-2 text-sm leading-6 text-[#B7BCB7]">{course.description}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-[#D7DBD7]">
                  <span>{course.lessons.length} שיעורים</span>
                  <span>{course.completed}/{course.lessons.length} הושלמו</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <StateBlock
          icon={<BookOpen aria-hidden="true" size={22} />}
          title="אין קורסים זמינים עדיין"
          description="קורסים שיפורסמו יופיעו כאן."
        />
      )}
    </ClientShell>
  );
}
