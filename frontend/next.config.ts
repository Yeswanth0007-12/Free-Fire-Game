import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/download/apk",
        destination: "https://github.com/Yeswanth0007-12/Free-Fire-Game/releases/download/v1.0.4/clashiq-v1.0.4.apk",
      },
    ];
  },
};

export default nextConfig;
