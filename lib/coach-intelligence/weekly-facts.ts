// What a week actually contained, counted rather than characterised. Every
// field is either a number the client produced or undefined, and undefined means
// "the client did not report this", not zero. That distinction is the whole
// reason a summary can be honest: "no workouts completed" and "no workout data"
// are different sentences, and only one of them is a criticism.

export type MetricWindow = Readonly<{ value: number; previous?: number }>;

export type WeeklyFacts = Readonly<{
  weekStart: string;
  weekEnd: string;
  workouts?: Readonly<{ completed: number; planned: number; skipped: number; volumeKg: number; previousCompleted?: number }>;
  nutrition?: Readonly<{ daysReported: number; mealsEaten: number; mealsPlanned: number; freeCalorieDays: number }>;
  steps?: Readonly<{ daysReported: number; average: number; goal: number; daysMetGoal: number; previousAverage?: number }>;
  weight?: Readonly<{ entries: number; latestKg: number; changeKg?: number }>;
  measurements?: Readonly<{ entries: number; changedSites: readonly string[] }>;
  checkIns?: Readonly<{ submitted: number; reviewed: number }>;
}>;

export const hasAnyFacts = (facts: WeeklyFacts): boolean =>
  Boolean(facts.workouts || facts.nutrition || facts.steps || facts.weight || facts.measurements || facts.checkIns);

// How much of the week the client is actually visible in. A summary written from
// one signal out of six is worth less than one written from five, and the reader
// deserves to be told which they are holding.
export function factCoverage(facts: WeeklyFacts): Readonly<{ present: number; total: number; sparse: boolean }> {
  const present = [facts.workouts, facts.nutrition, facts.steps, facts.weight, facts.measurements, facts.checkIns].filter(Boolean).length;
  return { present, total: 6, sparse: present > 0 && present <= 2 };
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Hebrew reads better with the small numbers written out, and a summary that
// says "3 אימונים" next to "שלושה אימונים" looks machine-made.
const WORDS = ["אפס", "אימון אחד", "שני", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה"] as const;
export function countPhrase(count: number, singular: string, plural: string): string {
  if (count === 1) return `${singular} אחד`;
  if (count >= 2 && count <= 7) return `${WORDS[count]} ${plural}`;
  return `${count} ${plural}`;
}
