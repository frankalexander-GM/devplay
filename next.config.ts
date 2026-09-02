import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Permitir origins del preview panel
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai"],
};

export default nextConfig;
