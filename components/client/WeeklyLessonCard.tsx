import Link from "next/link";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import type { LessonSource } from "@/lib/content/weekly-lesson";

// One lesson, on the screen the client opens every day.
//
// The library had a tile and nothing else - a client who never pressed it never
// met the content at all, and a course nobody opens is a course that was not
// written. A single lesson a week, in the order the courses were built, asks for
// one decision instead of thirty.
export default function WeeklyLessonCard({ lesson }: { lesson: LessonSource }) {
  const done = lesson.progressPercent >= 100;
  return (
    <Link href={`/content/${lesson.id}`} className="weekly-lesson">
      <span className="weekly-lesson__icon" aria-hidden="true">
        {lesson.contentType === "video" ? <PlayCircle size={20} /> : <BookOpen size={20} />}
      </span>
      <span className="weekly-lesson__body">
        <span className="weekly-lesson__eyebrow">
          {lesson.categoryName}
          {done ? <CheckCircle2 aria-hidden="true" size={13} /> : null}
        </span>
        <strong className="weekly-lesson__title">{lesson.title}</strong>
        {lesson.estimatedMinutes ? (
          <span className="weekly-lesson__meta">{lesson.estimatedMinutes} דקות</span>
        ) : null}
      </span>
    </Link>
  );
}
