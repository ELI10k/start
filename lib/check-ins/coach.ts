export type CoachCheckInStatus = "new" | "responded" | "handled";

export function coachCheckInStatus(item: {
  status: string;
  handled_at: string | null;
}): CoachCheckInStatus {
  if (item.handled_at) return "handled";
  return item.status === "reviewed" ? "responded" : "new";
}

export function comparisonDelta(
  left: number | null,
  right: number | null,
) {
  return left === null || right === null ? null : right - left;
}
