import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.wasabisys.com",
      },
      ...(process.env.NEXT_PUBLIC_CDN_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
            },
          ]
        : []),
    ],
  },
  experimental: {
    optimizePackageImports: [
      "@tinadmin/core",
      "@tinadmin/ui-admin",
      "@heroicons/react",
    ],
  },
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    const path = require("path");
    const corePath = path.resolve(__dirname, "../../packages/@tinadmin/core/src");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/core": corePath,
      "@tinadmin/core": corePath,
      "@tinadmin/ui-admin": path.resolve(
        __dirname,
        "../../packages/@tinadmin/ui-admin/src"
      ),
      "@tinadmin/config": path.resolve(
        __dirname,
        "../../packages/@tinadmin/config/src"
      ),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
};

export default nextConfig;

