import type { UserRole } from "@/lib/supabase/database.types";

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://start.local");
    if (url.origin !== "https://start.local") return null;
    if (
      url.pathname.startsWith("/auth/") ||
      url.pathname === "/login" ||
      url.pathname === "/unauthorized"
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function returnPathForRole(
  value: string | null | undefined,
  role: UserRole,
): string | null {
  const path = safeReturnPath(value);
  if (!path) return null;
  const coachPath =
    path === "/coach" || path.startsWith("/coach/");
  return (role === "coach") === coachPath ? path : null;
}

export function loginPathFor(destination: string): string {
  return `/login?next=${encodeURIComponent(destination)}`;
}
