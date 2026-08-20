// Shared between the server repository and the thread component, so the types
// live apart from the repository - that module is server-only, and a client
// component importing it would pull the Supabase server client into the browser.

export type DirectMessage = Readonly<{
  id: string;
  body: string;
  topic: "general" | "support" | "profile_update";
  createdAt: string;
  readAt: string | null;
  fromMe: boolean;
}>;

export type CoachThread = Readonly<{
  clientId: string;
  lastBody: string;
  lastAt: string;
  unread: number;
}>;

export const TOPIC_LABELS: Readonly<Record<DirectMessage["topic"], string>> = {
  general: "הודעה",
  support: "פנייה לתמיכה",
  profile_update: "בקשת עדכון פרטים",
};
