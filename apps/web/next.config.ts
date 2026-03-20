import type { NextConfig } from "next";

const apiUpstream =
  process.env.API_UPSTREAM_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    if (apiUpstream.startsWith("/")) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
