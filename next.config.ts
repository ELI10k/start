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
  // Nothing here existed: no CSP, no HSTS, no frame or referrer policy. The
  // session cookie is readable by JavaScript - that is @supabase/ssr's design,
  // because the browser client has to read it - so the second layer matters.
  //
  // The CSP is Report-Only on purpose. Next injects inline scripts and inline
  // style, and a blocking policy without nonces takes the app down. Violations
  // surface in the browser console, so the enforcing version can be written
  // from what actually fires rather than from a guess. Everything else is
  // enforced now, because none of it can break a page.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // Supabase for data, storage and the realtime socket; the two YouTube
      // hosts are the lesson artwork already declared under images below.
      "img-src 'self' data: blob: https://*.supabase.co https://img.youtube.com https://i.ytimg.com https://i.pravatar.cc",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' blob: https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: csp },
          // Enforced on its own, because a report-only policy drops it and says
          // so in the console on every page load - and a console with a
          // standing complaint in it is a console nobody reads the real
          // violations out of. Safe to enforce today: nothing in the app is
          // served over http, so there is nothing for it to break.
          { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/150",
      },
      // Lesson artwork. Every video in the course library is a YouTube upload
      // and its still frame is served from here; the PDFs and the course covers
      // that came from the school keep their original host.
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
};

export default nextConfig;
