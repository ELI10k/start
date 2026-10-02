import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/auth/device";
import { getSupabaseConfig } from "@/lib/supabase/env";
import {
  loginPathFor,
  returnPathForRole,
} from "@/lib/auth/return-path";

const clientPrefixes = [
  "/nutrition",
  "/progress",
  "/check-in",
  "/profile",
  "/preferences",
  "/support",
  "/content",
  "/workouts",
  "/onboarding",
  // These three were reachable without passing through here at all. Each page
  // does its own `getAuthContext` check, so nothing leaked - but the middleware
  // is where the client device lock lives, and a client whose device was
  // replaced kept reading the coach conversation and their notifications from
  // the old phone. It is also where `Cache-Control: private, no-store` is set,
  // and a screen carrying one person's messages must never be cacheable.
  "/messages",
  "/notifications",
  "/shopping",
];

const isSharedPath = (path: string) => path === "/foods" || path.startsWith("/foods/");
const isPrivatePath = (path: string) =>
  path === "/" ||
  path === "/coach" ||
  path.startsWith("/coach/") ||
  isSharedPath(path) ||
  clientPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

type PendingCookie = Readonly<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostname = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname
  )
    .split(":")[0]
    .toLowerCase();

  // Serve the public storefront on the primary domain. The authenticated app
  // keeps its existing root route on start.elicohenfitness.co.il.
  if (
    path === "/" &&
    (hostname === "elicohenfitness.co.il" || hostname === "www.elicohenfitness.co.il")
  ) {
    const landingUrl = request.nextUrl.clone();
    landingUrl.pathname = "/join";
    return NextResponse.redirect(landingUrl);
  }

  // Public routes and route handlers own their own access rules. Running every
  // anonymous API request through Supabase first meant that a temporary auth
  // outage turned an intentional 401 (barcode and cron endpoints, for example)
  // into an unrelated 500 before the handler could answer at all.
  if (!isPrivatePath(path) && path !== "/login") {
    return NextResponse.next();
  }

  const config = getSupabaseConfig();
  const requestedPath = `${path}${request.nextUrl.search}`;

  if (!config) {
    return isPrivatePath(path)
      ? NextResponse.redirect(new URL(loginPathFor(requestedPath), request.url))
      : NextResponse.next();
  }

  let pendingCookies: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  const applyPendingAuthState = (target: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      target.cookies.set(name, value, options);
    });
    Object.entries(pendingHeaders).forEach(([name, value]) => {
      target.headers.set(name, value);
    });
    target.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    return target;
  };

  // A server action's client does not follow a 307. It expects either
  // `content-type: text/x-component` or an `x-action-redirect` header, and
  // anything else - the HTML of /login, at the end of a redirect chain - surfaces
  // to the user as "An unexpected response was received from the server." on top
  // of whatever they were trying to save. Redirecting a signed-out or
  // device-mismatched action has to be said in the form the router understands.
  const isServerAction = Boolean(request.headers.get("next-action"));
  const redirect = (destination: string) => {
    const url = new URL(destination, request.url);
    if (isServerAction) {
      return applyPendingAuthState(new NextResponse("", {
        status: 200,
        headers: { "content-type": "text/plain", "x-action-redirect": `${url.toString()};replace` },
      }));
    }
    return applyPendingAuthState(NextResponse.redirect(url));
  };

  let response = applyPendingAuthState(NextResponse.next({ request }));

  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("-auth-token"),
  );

  // With no Supabase session cookie there is nothing to refresh or validate.
  // Redirecting locally is both faster and, crucially, still works while the
  // auth service is temporarily unreachable.
  if (!hasAuthCookie) {
    return isPrivatePath(path) ? redirect(loginPathFor(requestedPath)) : response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        const replacements = new Set(items.map(({ name }) => name));
        pendingCookies = [
          ...pendingCookies.filter(({ name }) => !replacements.has(name)),
          ...items,
        ];
        pendingHeaders = { ...pendingHeaders, ...headers };
        response = applyPendingAuthState(NextResponse.next({ request }));
      },
    },
  });

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Authentication infrastructure must fail closed without turning a normal
    // signed-out visit into a server error page.
    return isPrivatePath(path) ? redirect(loginPathFor(requestedPath)) : response;
  }

  if (!isPrivatePath(path)) {
    if (path === "/login" && user) {
      const { data } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .single();
      if (data?.status === "active" && (data.role === "coach" || data.role === "client")) {
        const requestedReturn = request.nextUrl.searchParams.get("next");
        return redirect(
          returnPathForRole(requestedReturn, data.role) ??
            (data.role === "coach" ? "/coach" : "/"),
        );
      }
    }
    return response;
  }

  if (!user) return redirect(loginPathFor(requestedPath));

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return redirect(loginPathFor(requestedPath));
  if (profile.status !== "active") return redirect("/unauthorized");

  if (profile.role === "client" && path !== "/onboarding") {
    const [{ data: onboarding }, { data: relationship }] = await Promise.all([
      supabase.from("client_profiles").select("onboarding_completed").eq("user_id", user.id).maybeSingle(),
      supabase.from("coach_client_relationships").select("coach_id").eq("client_id", user.id).eq("status", "active").maybeSingle(),
    ]);
    if (!relationship && !onboarding?.onboarding_completed) return redirect("/onboarding");
  }

  const coachPath = path === "/coach" || path.startsWith("/coach/");
  if (!isSharedPath(path) && (profile.role === "coach") !== coachPath) {
    return redirect("/unauthorized");
  }

  if (profile.role === "client") {
    const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
    if (!deviceId) {
      await supabase.auth.signOut({ scope: "local" });
      return redirect(`${loginPathFor(requestedPath)}&reason=device`);
    }

    const { data: device } = await supabase
      .from("device_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("device_id", deviceId)
      .is("revoked_at", null)
      .maybeSingle();
    if (!device) {
      await supabase.auth.signOut({ scope: "local" });
      return redirect(`${loginPathFor(requestedPath)}&reason=replaced`);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
