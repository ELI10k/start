"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ChevronLeft, LayoutGrid } from "lucide-react";

/* The library's own navigation bar, at the very top of the page and stuck there.
   It carries two things a long shelf needs and the app chrome does not give it:
   a jump to any of the eleven course rows without scrolling past the other ten,
   and a way back. The back and forward arrows are the browser's own history -
   the client got here from somewhere, and on a phone in a home-screen app there
   is no browser chrome to return with. */
export default function CoursePicker({
  courses,
}: {
  courses: readonly { slug: string; name: string; lessons: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const jump = (slug: string, name: string) => {
    setOpen(false);
    setCurrent(name);
    const target = document.getElementById(`course-${slug}`);
    if (!target) return;
    // The header floats over the page, so scrolling the row to the very top
    // would slide its title underneath it.
    // The bar itself is stuck to the top of the page, so a row scrolled to the
    // very top would sit underneath it.
    const bar = root.current?.getBoundingClientRect().height ?? 0;
    const top = target.getBoundingClientRect().top + window.scrollY - bar - 12;
    window.scrollTo({ top, behavior: "smooth" });
    target.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  };

  return (
    <div className="cinema-picker" ref={root}>
      <div className="cinema-picker__bar cinema-gutter">
        <button
          type="button"
          className="cinema-picker__step"
          aria-label="חזרה"
          onClick={() => router.back()}
        >
          <ArrowRight aria-hidden="true" size={20} />
        </button>
        <button
          type="button"
          className="cinema-picker__button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((was) => !was)}
        >
          <LayoutGrid aria-hidden="true" size={18} />
          <span>{current ?? "בחירת קורס לצפייה"}</span>
          <ChevronDown
            aria-hidden="true"
            size={18}
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </button>
        <button
          type="button"
          className="cinema-picker__step"
          aria-label="קדימה"
          onClick={() => router.forward()}
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
      </div>
      {open ? (
        <div className="cinema-picker__menu cinema-gutter" role="listbox">
          <ul>
            {courses.map((course) => (
              <li key={course.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current === course.name}
                  onClick={() => jump(course.slug, course.name)}
                >
                  <span>{course.name}</span>
                  <small>{course.lessons} שיעורים</small>
                  {current === course.name ? (
                    <Check aria-hidden="true" size={17} />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
