"use client";

import { ReviewsProvider } from "@listing-platform/reviews";

/**
 * Client-side wrapper for ReviewsProvider
 * Handles base URL detection for API calls
 */
export function ReviewsProviderWrapper({ children }: { children: React.ReactNode }) {
  // Get base URL - use environment variable or detect from window
  const baseUrl = 
    process.env.NEXT_PUBLIC_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3030');

  return (
    <ReviewsProvider config={{ baseUrl }}>
      {children}
    </ReviewsProvider>
  );
}
