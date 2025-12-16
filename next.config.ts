import type { NextConfig } from "next";

const DEPLOY_RELAXED = process.env.DEPLOY_RELAXED === "1";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bhbohlhathgogvflggdl.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: DEPLOY_RELAXED,
  },
  typescript: {
    ignoreBuildErrors: DEPLOY_RELAXED,
  },
};

export default nextConfig;
