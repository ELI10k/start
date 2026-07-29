import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { requireSupabaseConfig } from "./env";

type PendingCookie = Readonly<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

export function createSupabaseRouteClient(request: NextRequest) {
  const { url, anonKey } = requireSupabaseConfig();
  let pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        // Auth can write its cookie chunks across more than one operation
        // (for example verifyOtp followed by setSession). Keep the latest
        // value for each cookie instead of discarding cookies set earlier in
        // the same request, so the redirect always carries the full session.
        const replacements = new Set(items.map(({ name }) => name));
        pendingCookies = [
          ...pendingCookies.filter(({ name }) => !replacements.has(name)),
          ...items,
        ];
        pendingHeaders = { ...pendingHeaders, ...headers };
      },
    },
  });

  const applyAuthState = <T extends NextResponse>(response: T): T => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    Object.entries(pendingHeaders).forEach(([name, value]) => {
      response.headers.set(name, value);
    });
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    return response;
  };

  return { supabase, applyAuthState } as const;
}
