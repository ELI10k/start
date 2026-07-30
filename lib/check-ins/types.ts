export type CheckInStatus = "updated" | "missing";
export type CoachAttentionFlag = "missing-update" | "low-hunger" | "low-sleep" | "low-energy" | "concern-mentioned";
export type Rating = 1 | 2 | 3 | 4 | 5;

export type WeeklyCheckIn = Readonly<{
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  waistCm: number;
  hunger: Rating;
  sleep: Rating;
  energy: Rating;
  trainingCompleted: boolean;
  note?: string;
}>;
