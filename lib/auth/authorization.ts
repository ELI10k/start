import type { UserRole } from "@/lib/supabase/database.types";
export function destinationForRole(role: UserRole): "/coach" | "/" { return role === "coach" ? "/coach" : "/"; }
export function canAccessPath(role: UserRole, pathname: string): boolean { const coachPath = pathname === "/coach" || pathname.startsWith("/coach/"); return role === "coach" ? coachPath : !coachPath; }
export function canCoachAccessClient(relationships: readonly { coachId: string; clientId: string; status: string }[], coachId: string, clientId: string): boolean { return relationships.some((item) => item.coachId === coachId && item.clientId === clientId && item.status === "active"); }
