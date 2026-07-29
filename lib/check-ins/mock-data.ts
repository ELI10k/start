import type { WeeklyCheckIn } from "./types.ts";

export const mockCheckIns: readonly WeeklyCheckIn[] = [
  { id: "noam-c1", clientId: "noam-levi", date: "2026-07-18", weightKg: 82.4, waistCm: 89, hunger: 4, sleep: 4, energy: 4, trainingCompleted: true, note: "שבוע יציב" },
  { id: "maya-c1", clientId: "maya-cohen", date: "2026-07-17", weightKg: 64.8, waistCm: 73, hunger: 3, sleep: 4, energy: 4, trainingCompleted: true },
  { id: "itai-c1", clientId: "itai-shahar", date: "2026-07-12", weightKg: 91.2, waistCm: 98, hunger: 2, sleep: 2, energy: 2, trainingCompleted: false, note: "קושי בשינה" },
  { id: "yael-c1", clientId: "yael-david", date: "2026-07-16", weightKg: 58.6, waistCm: 68, hunger: 4, sleep: 5, energy: 4, trainingCompleted: true },
  { id: "shira-c1", clientId: "shira-peretz", date: "2026-07-18", weightKg: 70.3, waistCm: 79, hunger: 3, sleep: 4, energy: 3, trainingCompleted: true },
  { id: "ronit-c1", clientId: "ronit-tal", date: "2026-07-15", weightKg: 67.5, waistCm: 76, hunger: 4, sleep: 3, energy: 4, trainingCompleted: true },
];

export const getMockCheckIns = (clientId: string) => mockCheckIns.filter((entry) => entry.clientId === clientId);
