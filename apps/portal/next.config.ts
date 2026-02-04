import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    /**
     * CUSTOMIZE: Allowlist remote image hosts.
     * - NEXT_PUBLIC_CDN_URL: single CDN base URL (e.g., https://cdn.example.com)
     * - NEXT_PUBLIC_IMAGE_HOSTS: comma-separated hostnames (e.g., img1.example.com,img2.example.com)
     */
    remotePatterns: [
      // Allow Unsplash images (commonly used in templates)
      {
        protocol: "https" as const,
        hostname: "images.unsplash.com",
      },
      ...(process.env.NEXT_PUBLIC_CDN_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
            },
          ]
        : []),
      ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS
        ? process.env.NEXT_PUBLIC_IMAGE_HOSTS.split(",")
            .map((host) => host.trim())
            .filter(Boolean)
            .map((hostname) => ({
              protocol: "https" as const,
              hostname,
            }))
        : []),
    ],
  },
  
  // Enable compression
  compress: true,

  // Output configuration for static export (optional)
  // Note: 'standalone' is for production builds only, not dev mode
  // output: 'standalone',

  // Bundle optimization for consumer portal
  // Temporarily disabled due to Next.js 15.5.9 bug: expandNextJsTemplate is not a function
  // experimental: {
  //   optimizePackageImports: [
  //     "@tinadmin/core",
  //     "@tinadmin/ui-consumer",
  //     "@heroicons/react",
  //     "@builder.io/react",
  //   ],
  // },

  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      '@tinadmin/core': '../../packages/@tinadmin/core/src',
      '@tinadmin/ui-consumer': '../../packages/@tinadmin/ui-consumer/src',
      '@tinadmin/config': '../../packages/@tinadmin/config/src',
      '@/core': '../../packages/@tinadmin/core/src',
    },
  },

  // Webpack configuration
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    
    // Optimize bundle size with aliases for better tree-shaking
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tinadmin/core': path.resolve(__dirname, '../../packages/@tinadmin/core/src'),
      '@tinadmin/ui-consumer': path.resolve(__dirname, '../../packages/@tinadmin/ui-consumer/src'),
      '@tinadmin/config': path.resolve(__dirname, '../../packages/@tinadmin/config/src'),
      // Resolve @/core/* imports from @tinadmin/core package
      '@/core': path.resolve(__dirname, '../../packages/@tinadmin/core/src'),
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
