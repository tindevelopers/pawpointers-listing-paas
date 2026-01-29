"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReviewForm } from "@listing-platform/reviews";
import { createClient } from "@/core/database/client";

interface AuthenticatedReviewFormProps {
  entityId: string;
  listingId?: string;
  onSubmit?: (reviewId: string) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Wrapper component that checks authentication before showing review form
 * Shows signup prompt if user is not authenticated
 * Uses client-only rendering to avoid hydration mismatches
 */
export function AuthenticatedReviewForm({
  entityId,
  listingId,
  onSubmit,
  onCancel,
  className,
}: AuthenticatedReviewFormProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const returnUrl = pathname || "/";

  // Only run on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Show nothing until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sign up to leave a review
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a free account to share your experience and help other pet parents make informed decisions.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/signup?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Account
          </Link>
          <Link
            href={`/signin?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewForm
      entityId={entityId}
      listingId={listingId}
      onSubmit={onSubmit}
      onCancel={onCancel}
      className={className}
    />
  );
}
