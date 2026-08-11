import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Universal Links, and the reason START needs them.
//
// The native shell loads the deployed site in a web view with its own cookie
// store. A magic-link email tapped on the phone opens in Safari, so the session
// is established in Safari's cookies and the app is still signed out - the exact
// "I keep having to log in" complaint, in a form no amount of session work
// fixes.
//
// With this file served and the associated-domains entitlement in place, iOS
// opens https://<domain>/auth/confirm-link in the app instead. The bridge routes
// it through the same in-app-paths-only check a tapped notification goes
// through, so the OTP is exchanged inside the web view and the session lands
// where the app can use it.
//
// BLOCKED-EXTERNAL: the Team ID only exists once the Apple Developer account
// does. Until APPLE_TEAM_ID is set this route 404s on purpose - iOS caches this
// file, and a placeholder Team ID would be cached as a wrong answer and keep
// working against us after the real one arrived.
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim() || "co.il.startcoaching.app";

  if (!teamId || !/^[A-Z0-9]{10}$/.test(teamId)) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${teamId}.${bundleId}`],
            components: [
              // The two journeys that must land in the app rather than Safari.
              { "/": "/auth/confirm-link", comment: "magic link" },
              { "/": "/auth/confirm-invite", comment: "client invitation" },
              { "/": "/auth/callback*", comment: "supabase auth callback" },
            ],
          },
        ],
      },
    },
    {
      // Apple fetches this without following redirects and requires JSON. It
      // must not be behind auth, and it must not be cached long: a wrong file is
      // sticky, so a short TTL is what makes the first correct deploy take hold.
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
