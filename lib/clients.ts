export type ClientStatus = "active" | "needs-attention" | "paused";

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  currentWeight: number;
  waist: number;
  targetWeight: number;
  lastCheckIn: string;
  status: ClientStatus;
  updatedThisWeek: boolean;
};

export const clients: Client[] = [
  { id: "noam-levi", fullName: "נועם לוי", phone: "050-482-1937", currentWeight: 82.4, waist: 89, targetWeight: 76, lastCheckIn: "2026-07-18", status: "active", updatedThisWeek: true },
  { id: "maya-cohen", fullName: "מאיה כהן", phone: "052-391-6048", currentWeight: 64.8, waist: 73, targetWeight: 60, lastCheckIn: "2026-07-17", status: "active", updatedThisWeek: true },
  { id: "itai-shahar", fullName: "איתי שחר", phone: "054-216-7750", currentWeight: 91.2, waist: 98, targetWeight: 84, lastCheckIn: "2026-07-12", status: "needs-attention", updatedThisWeek: false },
  { id: "yael-david", fullName: "יעל דוד", phone: "050-814-3362", currentWeight: 58.6, waist: 68, targetWeight: 56, lastCheckIn: "2026-07-16", status: "active", updatedThisWeek: true },
  { id: "daniel-amar", fullName: "דניאל עמר", phone: "053-750-1894", currentWeight: 78.1, waist: 84, targetWeight: 74, lastCheckIn: "2026-07-10", status: "paused", updatedThisWeek: false },
  { id: "shira-peretz", fullName: "שירה פרץ", phone: "052-672-4105", currentWeight: 70.3, waist: 79, targetWeight: 64, lastCheckIn: "2026-07-18", status: "active", updatedThisWeek: true },
  { id: "omer-bar", fullName: "עומר בר", phone: "054-933-5218", currentWeight: 86.7, waist: 92, targetWeight: 80, lastCheckIn: "2026-07-08", status: "needs-attention", updatedThisWeek: false },
  { id: "ronit-tal", fullName: "רונית טל", phone: "050-365-9021", currentWeight: 67.5, waist: 76, targetWeight: 62, lastCheckIn: "2026-07-15", status: "active", updatedThisWeek: true },
  { id: "alon-gabay", fullName: "אלון גבאי", phone: "052-148-7639", currentWeight: 95.4, waist: 103, targetWeight: 88, lastCheckIn: "2026-07-13", status: "active", updatedThisWeek: false },
  { id: "tamar-raz", fullName: "תמר רז", phone: "053-589-2476", currentWeight: 61.9, waist: 71, targetWeight: 58, lastCheckIn: "2026-07-06", status: "paused", updatedThisWeek: false },
];

export const clientStatusLabels: Record<ClientStatus, string> = {
  active: "פעיל/ה",
  "needs-attention": "דורש/ת תשומת לב",
  paused: "בהשהיה",
};

export function getClientById(id: string) {
  return clients.find((client) => client.id === id);
}
