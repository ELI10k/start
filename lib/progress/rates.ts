export type WeightPoint = Readonly<{ date: string; value: number }>;

export type WeightChangeRates = Readonly<{
  days: number;
  weeklyKg: number | null;
  monthlyKg: number | null;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(date: string) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed / DAY_MS : null;
}

function rounded(value: number) {
  return Number(value.toFixed(2));
}

/**
 * Normalises the change between the first and last measurement by the actual
 * number of elapsed days. This stays accurate when weigh-ins are irregular.
 */
export function averageWeightChangeRates(points: readonly WeightPoint[]): WeightChangeRates | null {
  if (points.length < 2) return null;
  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const first = ordered[0];
  const latest = ordered.at(-1)!;
  const firstDay = dayNumber(first.date);
  const latestDay = dayNumber(latest.date);
  if (firstDay === null || latestDay === null || latestDay <= firstDay) return null;

  const days = latestDay - firstDay;
  const dailyChange = (latest.value - first.value) / days;
  return {
    days,
    // Never turn a few volatile days into a dramatic weekly/monthly forecast.
    // Each rate becomes meaningful only after its own full observation window.
    weeklyKg: days >= 7 ? rounded(dailyChange * 7) : null,
    monthlyKg: days >= 30 ? rounded(dailyChange * (365.25 / 12)) : null,
  };
}
