import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Allows isolated QA builds without disturbing an active local dev server.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  trailingSlash: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      "i.scdn.co",
      "mosaic.scdn.co",
      "image-cdn-ak.spotifycdn.com",
    ].map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/**",
      search: "",
    })),
  },
};

export default nextConfig;
