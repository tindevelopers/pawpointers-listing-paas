"use client";

import React from "react";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";

// CUSTOMIZE: Import brand config for dynamic branding
// import { brandConfig } from '@/config/brand.config';

/**
 * ConsumerLayout - Clean layout for consumer-facing pages
 * 
 * CUSTOMIZE: This is a simple layout wrapper. For full-featured layouts,
 * use the Header, Footer, and Navbar components from @/components/layout
 * 
 * This layout is designed for public-facing or consumer pages.
 * It does NOT include admin sidebar or header components.
 * Optimized for SEO and consumer experience.
 */
export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Consumer Header - Simple, clean header without admin navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {/* CUSTOMIZE: Update platform name from brandConfig */}
                {PLATFORM_NAME}
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              {/* CUSTOMIZE: Add your navigation items here */}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area - No sidebar, full width */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Consumer Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-600 dark:text-gray-400">
            {/* CUSTOMIZE: Update copyright with your company name */}
            <p>&copy; {new Date().getFullYear()} {PLATFORM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
