import type { ProgressSummary, WeighIn } from "./types.ts";

const round = (value: number) => Number((Number.isFinite(value) ? value : 0).toFixed(1));
export const sortWeighIns = (entries: readonly WeighIn[]) => [...entries].sort((a, b) => a.date.localeCompare(b.date));
export const getLatestWeighIn = (entries: readonly WeighIn[]) => sortWeighIns(entries).at(-1);
export const getStartingWeighIn = (entries: readonly WeighIn[]) => sortWeighIns(entries)[0];

export function summarizeProgress(entries: readonly WeighIn[]): ProgressSummary {
  const ordered = sortWeighIns(entries);
  const first = ordered[0];
  const latest = ordered.at(-1);
  const previous = ordered.at(-2);
  const waistEntries = ordered.filter((entry) => Number.isFinite(entry.measurements.waistCm));
  const firstWaist = waistEntries[0]?.measurements.waistCm;
  const latestWaist = waistEntries.at(-1)?.measurements.waistCm;
  let weeklyTrend: ProgressSummary["weeklyTrend"] = "insufficient-data";
  if (latest && previous) {
    const change = round(latest.weightKg - previous.weightKg);
    weeklyTrend = change === 0 ? "stable" : change > 0 ? "up" : "down";
  }
  return {
    latestWeight: latest?.weightKg,
    startingWeight: first?.weightKg,
    weightChangeFromStart: latest && first ? round(latest.weightKg - first.weightKg) : undefined,
    weightChangeFromPrevious: latest && previous ? round(latest.weightKg - previous.weightKg) : undefined,
    latestWaist,
    startingWaist: firstWaist,
    waistChange: latestWaist !== undefined && firstWaist !== undefined ? round(latestWaist - firstWaist) : undefined,
    weeklyTrend,
  };
}
