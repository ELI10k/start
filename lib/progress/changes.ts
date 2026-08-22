/**
 * How far the client has moved, in the two numbers they came for.
 *
 * Lives here rather than inside the measurements screen because the home screen
 * quotes the same two figures now, and two screens doing this arithmetic
 * separately is how the day's totals drifted apart three times already. One
 * rule: the change is the newest reading minus the first one on record.
 */
export type ProgressReading = Readonly<{
  date: string;
  weight: number | string | null;
  navel_circumference: number | string | null;
}>;

export function numberOf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const seriesOf = (entries: readonly ProgressReading[], pick: (entry: ProgressReading) => number | null) =>
  [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((entry) => {
      const value = pick(entry);
      return value === null ? [] : [value];
    });

/** Null rather than zero when there is nothing to compare against: one reading
 *  is a dot, and "0 ק״ג" would announce a result the client has not had yet. */
export function changeOf(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  return Number((values[values.length - 1] - values[0]).toFixed(1));
}

export function progressChanges(entries: readonly ProgressReading[]) {
  const weights = seriesOf(entries, (entry) => numberOf(entry.weight));
  const navels = seriesOf(entries, (entry) => numberOf(entry.navel_circumference));
  return {
    latestWeight: weights.at(-1) ?? null,
    latestNavel: navels.at(-1) ?? null,
    weightChange: changeOf(weights),
    navelChange: changeOf(navels),
    readings: entries.length,
  };
}

/**
 * One sentence about where they are, and it has to be true.
 *
 * A line that says "כל הכבוד" to a client whose weight went up is worse than no
 * line at all - it tells them the app is not reading their numbers. So each case
 * states what actually happened, and the encouragement is in what it does with
 * it, not in pretending it is something else.
 */
export function motivationLine(changes: ReturnType<typeof progressChanges>): string {
  const { weightChange, navelChange, readings } = changes;
  if (!readings) return "המדידה הראשונה שלך פותחת את המעקב 📏";
  if (weightChange === null && navelChange === null) return "עוד מדידה אחת ויהיה אפשר לראות מגמה 📈";

  const down = (value: number | null) => value !== null && value < 0;
  const up = (value: number | null) => value !== null && value > 0;
  const abs = (value: number) => Math.abs(value);

  if (down(weightChange) && down(navelChange)) {
    return `ירדת ${abs(weightChange!)} ק״ג ו-${abs(navelChange!)} ס״מ מאז ההתחלה 🔥`;
  }
  if (down(weightChange)) return `${abs(weightChange!)} ק״ג פחות מאז ההתחלה — זה עובד 💪`;
  if (down(navelChange)) return `היקף הטבור ירד ב-${abs(navelChange!)} ס״מ — הגוף משתנה 📉`;
  if (up(weightChange) && up(navelChange)) return "המספרים עלו — שווה לדבר על זה בצ׳ק אין הקרוב 💬";
  if (up(weightChange)) return `המשקל עלה ב-${abs(weightChange!)} ק״ג — היקף הטבור מספר את שאר הסיפור 💬`;
  if (up(navelChange)) return `ההיקף עלה ב-${abs(navelChange!)} ס״מ — נסתכל על זה יחד בצ׳ק אין 💬`;
  return "שמרת על המספרים יציבים — גם זה תוצאה 👊";
}
