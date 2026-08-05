import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only. The E2E suite drives the dev server over 127.0.0.1, and Next
  // otherwise refuses to serve its dev resources to that origin, which leaves client
  // components unhydrated - a checkbox toggles in the DOM but no handler ever runs.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
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
