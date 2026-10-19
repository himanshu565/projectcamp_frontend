import type { NextConfig } from "next";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const cleanApiUrl = rawApiUrl.replace(/\/+$/, "");
const destinationUrl = cleanApiUrl.endsWith("/api/v1")
  ? `${cleanApiUrl}/:path*`
  : `${cleanApiUrl}/api/v1/:path*`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: destinationUrl,
      },
    ];
  },
};

export default nextConfig;
