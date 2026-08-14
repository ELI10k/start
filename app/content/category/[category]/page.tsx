import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Download, PlayCircle } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  listContentCategories,
  listPublishedContent,
} from "@/lib/data/content-repository";

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
  const course = categories.find((entry) => entry.slug === slug);
  if (!course || !lessons.length) notFound();
  const thumbnailUrl = lessons.find((lesson) => lesson.thumbnailUrl)?.thumbnailUrl;

  return (
    <ClientShell>
      <Link href="/content" className="premium-secondary-button mb-5 inline-flex">
        חזרה לכל הקורסים
      </Link>
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={`תמונת הקורס ${course.name}`}
          width={1175}
          height={660}
          priority
          unoptimized
          className="mb-6 max-h-[430px] w-full rounded-[28px] border border-[#E5E7E5] object-cover"
        />
      ) : null}
      <PageHeader
        eyebrow="קורס START"
        title={course.name}
        description={course.description ?? `${lessons.length} שיעורים במקום אחד, לפי סדר הצפייה.`}
      />

      <div className="grid gap-3">
        {lessons.map((lesson, index) => (
          <Link
            key={lesson.id}
            href={`/content/${lesson.id}`}
            className="premium-card flex items-center gap-4"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#EAF8EE] font-black text-[#16A34A]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black">{lesson.title}</span>
              <span className="mt-1 block text-sm text-[#5B5F5B]">
                {lesson.description ?? (lesson.contentType === "video" ? "שיעור וידאו" : "חומר להורדה")}
              </span>
            </span>
            {lesson.progressPercent >= 100 ? (
              <CheckCircle2 aria-label="הושלם" className="shrink-0 text-[#16A34A]" size={24} />
            ) : lesson.contentType === "video" ? (
              <PlayCircle aria-label="צפייה בשיעור" className="shrink-0 text-[#16A34A]" size={24} />
            ) : lesson.mediaUrl ? (
              <Download aria-label="פתיחת חומר להורדה" className="shrink-0 text-[#16A34A]" size={24} />
            ) : (
              <BookOpen aria-hidden="true" className="shrink-0 text-[#16A34A]" size={24} />
            )}
          </Link>
        ))}
      </div>
    </ClientShell>
  );
}
