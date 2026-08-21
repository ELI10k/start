import Link from "next/link";
import { formatIsraelDate } from "@/lib/date-time";

/**
 * The last seven days, as a row of links.
 *
 * Newest first, reading right to left, so today is where the eye starts and
 * yesterday is the next tap along. Days carry their weekday letter rather than
 * a date, because "ג׳" is what a person calls Tuesday and "19.8" is not.
 *
 * A plain set of links: no state, no client component, and every day is a URL
 * the client can keep or send.
 */
export default function NutritionDayStrip({
  days,
  active,
  today,
}: {
  days: readonly string[];
  active: string;
  today: string;
}) {
  return (
    <nav aria-label="בחירת יום" className="chip-row mb-3 overflow-x-auto [scrollbar-width:none]">
      {days.map((day) => {
        const isActive = day === active;
        const isToday = day === today;
        return (
          <Link
            key={day}
            href={isToday ? "/nutrition" : `/nutrition?date=${day}`}
            aria-current={isActive ? "page" : undefined}
            className={`chip shrink-0${isActive ? " pill--green" : ""}`}
          >
            {isToday ? "היום" : formatIsraelDate(`${day}T12:00:00Z`, { weekday: "short", day: "numeric" })}
          </Link>
        );
      })}
    </nav>
  );
}
