import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
