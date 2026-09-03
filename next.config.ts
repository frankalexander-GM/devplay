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
  // Proxy del chat en tiempo real para desarrollo/preview:
  // en producción Caddy enruta ?XTransformPort=3003, pero en dev no hay Caddy.
  // Socket.io (engine.io) manda siempre el query param EIO — lo reenviamos al
  // mini-servicio de tiempo real. Si el upgrade de websocket no atraviesa el
  // proxy, el cliente hace fallback a polling automáticamente.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "query", key: "EIO", value: ".*" }],
          destination: "http://localhost:3003/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
