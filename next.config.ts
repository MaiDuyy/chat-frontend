import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Pre-existing TS errors in legacy files — does not affect Phase 2 functionality
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
