import type { NextConfig } from "next";
import path from "path";

// In a monorepo, Next.js only loads .env from apps/dashboard. Load root .env.local
// so the dashboard gets NEXT_PUBLIC_SUPABASE_* and other shared vars.
try {
  const rootEnv = path.resolve(__dirname, "../../.env.local");
  require("dotenv").config({ path: rootEnv });
} catch {
  // dotenv or .env.local may be missing; dashboard may have its own .env.local
}

// Isolate auth cookies from customer portal (different port = same host in browser)
if (!process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME) {
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME = "sb-dashboard-auth";
}

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
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

