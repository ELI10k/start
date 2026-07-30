import type { WeighIn } from "./types.ts";

export const mockWeighIns: readonly WeighIn[] = [
  { id: "noam-w1", clientId: "noam-levi", date: "2026-06-20", weightKg: 84.1, measurements: { waistCm: 92 } },
  { id: "noam-w2", clientId: "noam-levi", date: "2026-07-04", weightKg: 83.2, measurements: { waistCm: 90.5 } },
  { id: "noam-w3", clientId: "noam-levi", date: "2026-07-18", weightKg: 82.4, measurements: { waistCm: 89 }, note: "הרגשה טובה השבוע" },
  { id: "maya-w1", clientId: "maya-cohen", date: "2026-06-19", weightKg: 66, measurements: { waistCm: 75 } },
  { id: "maya-w2", clientId: "maya-cohen", date: "2026-07-17", weightKg: 64.8, measurements: { waistCm: 73 } },
  { id: "itai-w1", clientId: "itai-shahar", date: "2026-06-14", weightKg: 92, measurements: { waistCm: 99 } },
  { id: "itai-w2", clientId: "itai-shahar", date: "2026-07-12", weightKg: 91.2, measurements: { waistCm: 98 } },
  { id: "shira-w1", clientId: "shira-peretz", date: "2026-07-01", weightKg: 71.1, measurements: { waistCm: 80 } },
  { id: "shira-w2", clientId: "shira-peretz", date: "2026-07-18", weightKg: 70.3, measurements: { waistCm: 79 } },
];

export const getMockWeighIns = (clientId: string) => mockWeighIns.filter((entry) => entry.clientId === clientId);
