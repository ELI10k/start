import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A page loaded before a deploy posts its server actions to the build that
  // replaced it, and the action id no longer exists there: the save returns
  // nothing and the coach loses the menu. Stamping the build id onto every asset
  // request is the half of skew protection that lives in the app; the other half
  // is Vercel's "Skew Protection" project setting, which routes those requests
  // back to the deployment they came from.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  // Development only. The E2E suite drives the dev server over 127.0.0.1, and Next
  // otherwise refuses to serve its dev resources to that origin, which leaves client
  // components unhydrated - a checkbox toggles in the DOM but no handler ever runs.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // The router keeps a client-side copy of a page it has already visited and
    // reuses it for the next 30 seconds - or until a hard reload - which on a
    // dynamic, per-client screen means a coach reloads the client file and is
    // served the version from before the client submitted anything. Two of the
    // defects reported in this round were that copy, not the server: the text on
    // screen was from a build that had already been replaced. Nothing here is
    // cacheable across a navigation anyway; every screen is a live read behind an
    // auth cookie.
    staleTimes: { dynamic: 0 },
    serverActions: {
      // Three optional 5MB photos plus multipart boundaries and field metadata.
      bodySizeLimit: "16mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/150",
      },
    ],
  },
};

export default nextConfig;
