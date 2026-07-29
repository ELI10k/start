import type { WeeklyCheckIn } from "../check-ins/types.ts";
import type { WeighIn } from "../progress/types.ts";

export type ClientIdentity = Readonly<{ id: string; role: "client"; demo: true }>;
export type ClientProfileRecord = Readonly<{ fullName: string; phone: string; targetWeightKg: number }>;
export type DemoPreferences = Readonly<{ reminders: boolean; weeklySummary: boolean; compactMeals: boolean }>;
export type MealCompletionRecord = Readonly<Record<string, "pending" | "eaten">>;
export type ContentProgress = Readonly<Record<string, "started" | "complete">>;
export type CoachNote = Readonly<{ id: string; clientId: string; body: string; createdAt: string }>;

export type DemoSnapshot = Readonly<{
  identity: ClientIdentity;
  profile: ClientProfileRecord;
  assignedMealPlanId?: string;
  mealCompletions: MealCompletionRecord;
  measurements: readonly WeighIn[];
  weightEntries: readonly WeighIn[];
  checkIns: readonly WeeklyCheckIn[];
  preferences: DemoPreferences;
  contentProgress: ContentProgress;
  coachNotes: readonly CoachNote[];
}>;

export interface ClientDataAdapter {
  load(): DemoSnapshot;
  save(snapshot: DemoSnapshot): void;
  clear(): void;
}
