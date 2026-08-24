"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* A rail of cover art. On a phone it is a thumb scroll with snap points and
   nothing else; on a pointer device a chevron appears over each end and pages
   the row by a viewport at a time. The chevrons hide at the ends rather than
   sitting there dead, which is how the row says it has run out. */
export default function CinemaRail({
  title,
  href,
  id,
  children,
}: {
  title: string;
  href?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const node = track.current;
    if (!node) return;
    // The library is RTL, where scrollLeft counts negatively away from the
    // start. One absolute measurement then works in both directions.
    const offset = Math.abs(node.scrollLeft);
    setAtStart(offset <= 4);
    setAtEnd(offset >= node.scrollWidth - node.clientWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const rtl = getComputedStyle(node).direction === "rtl";
    node.scrollBy({
      left: direction * node.clientWidth * 0.84 * (rtl ? -1 : 1),
      behavior: "smooth",
    });
  };

  const heading = (
    <h2>
      {title}
      {href ? <span className="cinema-rail__more"> הכל ›</span> : null}
    </h2>
  );

  return (
    <section className="cinema-rail" id={id}>
      <div className="cinema-rail__head cinema-gutter">
        {href ? <Link href={href}>{heading}</Link> : heading}
      </div>
      <div className="cinema-rail__viewport">
        <button
          type="button"
          className="cinema-rail__nav"
          data-side="start"
          aria-label={`גלילה אחורה ב${title}`}
          disabled={atStart}
          onClick={() => page(-1)}
        >
          <ChevronRight aria-hidden="true" size={28} />
        </button>
        <div className="cinema-rail__track" ref={track} onScroll={measure}>
          {children}
        </div>
        <button
          type="button"
          className="cinema-rail__nav"
          data-side="end"
          aria-label={`גלילה קדימה ב${title}`}
          disabled={atEnd}
          onClick={() => page(1)}
        >
          <ChevronLeft aria-hidden="true" size={28} style={{ transform: "scaleX(-1)" }} />
        </button>
      </div>
    </section>
  );
}
