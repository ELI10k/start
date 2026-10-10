export type LessonSource = Readonly<{
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  contentType: "article" | "video";
  estimatedMinutes: number | null;
  progressPercent: number;
  sortOrder: number;
}>;

/**
 * The day a date falls on, counted from a fixed point.
 *
 * Keeping this date-based rather than request-based makes the tip stable for
 * the whole day: refreshing the dashboard does not unexpectedly swap it, while
 * the next calendar day advances every client to the next published item.
 */
const EPOCH = Date.UTC(2026, 0, 4);
const DAY_MS = 86_400_000;

const AUTOMATIC_GUIDES = {
  vacation: "המדריך תזונה בחופשה",
  events: "תזונה באירועים וחתונות",
  alcohol: "קלוריות באלכוהול",
  holiday: "איך לשמור על המשקל בחג",
  independence: "המדריך לתזונה ביום העצמאות",
  tuBishvat: "קלוריות בחג ט",
  shavuot: "תזונה בחג השבועות",
  passover: "תזונה בחג פסח",
  fast: "איך לעבור צום ללא תופעות לוואי",
  fruit: "קלוריות בפירות",
  barOr: "שיפור ריצת בר אור",
} as const;

type HolidayGuide = "holiday" | "independence" | "tuBishvat" | "shavuot" | "passover" | "fast";

function utcDate(dateKey: string, offsetDays = 0) {
  const parsed = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + offsetDays * DAY_MS);
}

function hebrewDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { month: value("month"), day: Number(value("day")) };
}

function isIsraeliIndependenceDay(date: Date, month: string, day: number) {
  if (month !== "Iyar" || day < 3 || day > 6) return false;
  const fifthOfIyar = new Date(date.getTime() + (5 - day) * DAY_MS);
  const weekday = fifthOfIyar.getUTCDay();
  if (weekday === 5) return day === 4; // Friday: observed Thursday.
  if (weekday === 6) return day === 3; // Saturday: observed Thursday.
  if (weekday === 1) return day === 6; // Monday: observed Tuesday.
  return day === 5;
}

function holidayOn(date: Date): HolidayGuide | null {
  const { month, day } = hebrewDate(date);
  if (month === "Tishri" && day === 1) return "holiday"; // Rosh Hashanah
  if (month === "Tishri" && day === 10) return "fast"; // Yom Kippur
  if (month === "Tishri" && day === 15) return "holiday"; // Sukkot
  if (month === "Shevat" && day === 15) return "tuBishvat";
  if (month === "Nisan" && day === 15) return "passover";
  if (isIsraeliIndependenceDay(date, month, day)) return "independence";
  if (month === "Sivan" && day === 6) return "shavuot";
  return null;
}

/** The relevant holiday guide from five days before the holiday through the holiday itself. */
export function holidayGuideForDay(dateKey: string): HolidayGuide | null {
  for (let offset = 0; offset <= 5; offset += 1) {
    const date = utcDate(dateKey, offset);
    if (!date) return null;
    const guide = holidayOn(date);
    if (guide) return guide;
  }
  return null;
}
export function dayIndex(dateKey: string): number {
  const at = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.floor((at - EPOCH) / DAY_MS));
}

/**
 * Today's tip: the library in course order, advanced by one every day.
 *
 * Ordered the way the library itself is - by course, then by the coach's order
 * inside it - so a client following along day by day reads the syllabus in the
 * sequence it was written, rather than whatever the newest upload happens to be.
 * It wraps at the end instead of running out.
 */
export function lessonForDay(
  lessons: readonly LessonSource[],
  categoryOrder: readonly string[],
  dateKey: string,
): LessonSource | null {
  if (!lessons.length) return null;
  const titleIncludes = (lesson: LessonSource, title: string) => lesson.title.includes(title);
  const holidayGuide = holidayGuideForDay(dateKey);
  if (holidayGuide) {
    const featured = lessons.find((lesson) => titleIncludes(lesson, AUTOMATIC_GUIDES[holidayGuide]));
    if (featured) return featured;
  }

  const month = Number(dateKey.slice(5, 7));
  const seasonalTitles = new Set<string>();
  if (month === 7 || month === 8) seasonalTitles.add(AUTOMATIC_GUIDES.vacation);
  if (month >= 5 && month <= 9) seasonalTitles.add(AUTOMATIC_GUIDES.events);
  if (month === 12 || month === 1 || month === 3) seasonalTitles.add(AUTOMATIC_GUIDES.alcohol);
  if (month >= 6 && month <= 8) seasonalTitles.add(AUTOMATIC_GUIDES.fruit);

  // Holiday guides never leak into an unrelated month. Bar-Or remains available
  // in the course library, but is intentionally never promoted automatically.
  const scheduledTitles = Object.values(AUTOMATIC_GUIDES);
  const eligible = lessons.filter((lesson) => {
    if (titleIncludes(lesson, AUTOMATIC_GUIDES.barOr)) return false;
    const scheduled = scheduledTitles.find((title) => titleIncludes(lesson, title));
    return !scheduled || seasonalTitles.has(scheduled);
  });
  if (!eligible.length) return null;
  const rank = (categoryId: string) => {
    const found = categoryOrder.indexOf(categoryId);
    // A lesson whose course is missing from the ordering sorts last rather than
    // first: -1 would have quietly promoted it above every real course.
    return found === -1 ? categoryOrder.length : found;
  };
  const ordered = [...eligible].sort((a, b) =>
    rank(a.categoryId) - rank(b.categoryId)
    || a.sortOrder - b.sortOrder
    || a.title.localeCompare(b.title, "he"));
  return ordered[dayIndex(dateKey) % ordered.length];
}
