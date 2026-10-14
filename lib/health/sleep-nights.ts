import { ISRAEL_TIME_ZONE } from "../date-time.ts";
import { calendarDay } from "./calculations.ts";
import { sourceDetailsKey } from "./sources.ts";
import type { DailySleep, HealthSource, HealthSourceDevice, SleepSample } from "./types.ts";

// Assembling nights from HealthKit's raw asleep samples.
//
// Two mistakes this replaces, both of which inflated or split a night:
//
// 1. Samples were bucketed by the calendar day they *started* on. A watch writes
//    a night as dozens of stage samples, so a night from 23:00 to 07:00 was cut
//    at midnight - an hour on one day, seven on the next - and the next day then
//    also collected the following night's first hour. A night now belongs to the
//    day the client woke up on: anything starting after 18:00 counts toward the
//    next morning, and a nap at 14:00 stays on its own day.
//
// 2. HealthKit hands back every writer's samples. Apple's source priority is a
//    presentation setting and is not applied to a sample query, so a ring and a
//    watch that both saw the same night would be added together. One writer is
//    chosen per night - the most detailed one, a dedicated wearable before an
//    Apple fallback, then the most recent - and its overlapping stage samples are
//    merged before minutes are counted.

const NIGHT_SHIFT_MS = 6 * 60 * 60 * 1000;
const STAGED = new Set<SleepSample["stage"]>(["core", "deep", "rem"]);

/** The calendar day a sleep interval is reported on: the morning it ends into. */
export function sleepNightKey(start: string | Date, timeZone = ISRAEL_TIME_ZONE): string {
  return calendarDay(new Date(new Date(start).getTime() + NIGHT_SHIFT_MS), timeZone);
}

/** Minutes covered by a set of intervals, counting overlaps once. */
export function mergedMinutes(intervals: readonly Readonly<{ start: string; end: string }>[]): number {
  const sorted = intervals
    .map((interval) => [Date.parse(interval.start), Date.parse(interval.end)] as const)
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0]);
  if (!sorted.length) return 0;
  let total = 0;
  let [currentStart, currentEnd] = sorted[0];
  for (const [start, end] of sorted.slice(1)) {
    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
    } else {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }
  total += currentEnd - currentStart;
  return Math.min(1440, Math.round(total / 60000));
}

const writerKey = (device: HealthSourceDevice | undefined) =>
  device?.sourceBundleIdentifier ?? device?.sourceName ?? sourceDetailsKey(device ? { devices: [device] } : undefined) ?? "";

const isThirdParty = (device: HealthSourceDevice | undefined) =>
  Boolean(device?.sourceBundleIdentifier) && !/^com\.apple\./i.test(device?.sourceBundleIdentifier ?? "");

type Candidate = { minutes: number; staged: boolean; thirdParty: boolean; latestEnd: number; device?: HealthSourceDevice };

const lowerPriority = (a: Candidate, b: Candidate) => {
  if (a.staged !== b.staged) return !a.staged;
  if (a.thirdParty !== b.thirdParty) return !a.thirdParty;
  return a.latestEnd < b.latestEnd;
};

export function sleepNightsFromSamples(
  samples: readonly SleepSample[],
  range: Readonly<{ fromDay: string; toDay: string }>,
  source: HealthSource,
  recordedAt: string,
  timeZone = ISRAEL_TIME_ZONE,
): readonly DailySleep[] {
  const nights = new Map<string, Map<string, SleepSample[]>>();
  for (const sample of samples) {
    if (!Number.isFinite(Date.parse(sample.start)) || !Number.isFinite(Date.parse(sample.end))) continue;
    const day = sleepNightKey(sample.start, timeZone);
    if (day < range.fromDay || day > range.toDay) continue;
    const writers = nights.get(day) ?? new Map<string, SleepSample[]>();
    const key = writerKey(sample.device);
    writers.set(key, [...(writers.get(key) ?? []), sample]);
    nights.set(day, writers);
  }

  const result: DailySleep[] = [];
  for (const day of [...nights.keys()].sort()) {
    let best: Candidate | undefined;
    for (const writerSamples of nights.get(day)!.values()) {
      const minutes = mergedMinutes(writerSamples);
      if (minutes <= 0) continue;
      const candidate: Candidate = {
        minutes,
        staged: writerSamples.some((sample) => STAGED.has(sample.stage)),
        thirdParty: isThirdParty(writerSamples[0].device),
        latestEnd: Math.max(...writerSamples.map((sample) => Date.parse(sample.end))),
        device: writerSamples.find((sample) => sample.device)?.device,
      };
      if (!best || lowerPriority(best, candidate)) best = candidate;
    }
    if (!best) continue;
    result.push({ day, minutes: best.minutes, source, recordedAt, details: best.device ? { devices: [best.device] } : undefined });
  }
  return result;
}
