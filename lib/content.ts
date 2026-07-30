export type ContentItem = Readonly<{ id: string; title: string; category: string; type: "video" | "article"; approved: false }>;
// Structural demo records only; no authored guidance is implied.
export const demoContentItems: readonly ContentItem[] = [
  { id: "nutrition-placeholder", title: "מקום שמור לתוכן תזונה", category: "תזונה", type: "video", approved: false },
  { id: "habits-placeholder", title: "מקום שמור לתוכן הרגלים", category: "הרגלים", type: "article", approved: false },
  { id: "progress-placeholder", title: "מקום שמור לתוכן התקדמות", category: "התקדמות", type: "video", approved: false },
];
export const contentCategories = [...new Set(demoContentItems.map((item) => item.category))];
export const findContent = (id: string) => demoContentItems.find((item) => item.id === id);
