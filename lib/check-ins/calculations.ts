import type { CoachAttentionFlag, WeeklyCheckIn } from "./types.ts";

export const sortCheckIns = (entries: readonly WeeklyCheckIn[]) => [...entries].sort((a, b) => a.date.localeCompare(b.date));
export const getLatestCheckIn = (entries: readonly WeeklyCheckIn[]) => sortCheckIns(entries).at(-1);

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function updatedThisWeek(entries: readonly WeeklyCheckIn[], now = new Date()): boolean {
  const latest = getLatestCheckIn(entries);
  if (!latest) return false;
  const date = new Date(`${latest.date}T12:00:00`);
  return Number.isFinite(date.getTime()) && date >= startOfWeek(now) && date <= now;
}

export const missingWeeklyUpdate = (entries: readonly WeeklyCheckIn[], now = new Date()) => !updatedThisWeek(entries, now);

export function getAttentionFlags(entries: readonly WeeklyCheckIn[], now = new Date()): CoachAttentionFlag[] {
  const latest = getLatestCheckIn(entries);
  if (!latest) return ["missing-update"];
  const flags: CoachAttentionFlag[] = [];
  if (missingWeeklyUpdate(entries, now)) flags.push("missing-update");
  if (latest.hunger <= 2) flags.push("low-hunger");
  if (latest.sleep <= 2) flags.push("low-sleep");
  if (latest.energy <= 2) flags.push("low-energy");
  if (/(דאג|קושי|כאב|בעיה|concern)/i.test(latest.note ?? "")) flags.push("concern-mentioned");
  return flags;
}
