import Link from "next/link";
import { formatIsraelDate } from "@/lib/date-time";

/**
 * The last seven days, as a row of links.
 *
 * Newest first, reading right to left, so today is where the eye starts and
 * yesterday is the next tap along.
 *
 * Two lines per day: the weekday above, the date below. It used to be one line
 * built by the Hebrew locale's own "short" weekday, which is not short - it
 * renders Friday the 21st as "יום ו׳ ה-21". Seven of those do not fit a phone,
 * and because a chip never wraps they spilled out of their columns and turned a
 * grid that was meant to show the whole week into a row you had to drag. Three
 * and a half days were on screen.
 *
 * And today now carries its date like every other day. The chip said "היום" and
 * nothing else, so the newest date a client could actually read was yesterday's
 * - which is why the strip looked like it had stopped updating.
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
    <nav aria-label="בחירת יום" className="day-strip mb-3">
      {days.map((day) => {
        const at = `${day}T12:00:00Z`;
        const isActive = day === active;
        const isToday = day === today;
        return (
          <Link
            key={day}
            href={isToday ? "/nutrition" : `/nutrition?date=${day}`}
            aria-current={isActive ? "page" : undefined}
            // Two glyphs and a number are enough to pick a day by, and not
            // enough to be read out by. The label spells the day in full.
            aria-label={`${isToday ? "היום, " : ""}${formatIsraelDate(at, { weekday: "long", day: "numeric", month: "long" })}`}
            className={`chip day-strip__day${isActive ? " pill--green" : ""}`}
          >
            <span aria-hidden="true" className="day-strip__weekday">
              {isToday ? "היום" : formatIsraelDate(at, { weekday: "narrow" })}
            </span>
            <span aria-hidden="true" className="day-strip__date">
              {formatIsraelDate(at, { day: "numeric", month: "numeric" })}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
