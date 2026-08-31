import "server-only";
import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/data/product-repository";

/**
 * The role check, said in the page rather than only in the proxy.
 *
 * proxy.ts is still where the device lock and the cache headers live, and it
 * still runs first. This is the second answer to the same question, for the
 * screens that had only the first - and a middleware bypass is a published
 * class of defect, not a hypothetical one. The data underneath was never
 * exposed either way, because every read goes through the caller's own session
 * and RLS; what was missing was the layer that stops a client reaching a screen
 * that was not built for them at all.
 *
 * Each of these redirects rather than returning null, so a page reads as one
 * line at the top and everything after it may assume the answer.
 */
export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireCoach(): Promise<AuthContext> {
  const auth = await requireUser();
  if (auth.role !== "coach") redirect("/unauthorized");
  return auth;
}

export async function requireClient(): Promise<AuthContext> {
  const auth = await requireUser();
  if (auth.role !== "client") redirect("/unauthorized");
  return auth;
}
