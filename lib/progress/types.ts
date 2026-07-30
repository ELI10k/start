export type BodyMeasurement = Readonly<{
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  armCm?: number;
}>;

export type WeighIn = Readonly<{
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  measurements: BodyMeasurement;
  note?: string;
}>;

export type ProgressSummary = Readonly<{
  latestWeight?: number;
  startingWeight?: number;
  weightChangeFromStart?: number;
  weightChangeFromPrevious?: number;
  latestWaist?: number;
  startingWaist?: number;
  waistChange?: number;
  weeklyTrend: "up" | "down" | "stable" | "insufficient-data";
}>;
