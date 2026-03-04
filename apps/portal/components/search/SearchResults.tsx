"use client";

import { ListingCard } from "@/components/listings/ListingCard";
import type { Listing } from "@/lib/listings";

/**
 * SearchResults - Grid display for listing search results
 *
 * CUSTOMIZE: Adjust grid layout, add view toggle (grid/list), or add map view
 */

interface SearchResultsProps {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
}

export function SearchResults({
  listings,
  total,
  page,
  totalPages,
  isLoading = false,
}: SearchResultsProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No listings found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {(page - 1) * listings.length + 1}-
        {Math.min(page * listings.length, total)} of {total} results
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 grid-flow-dense auto-rows-fr">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {/* Previous */}
          <a
            href={page > 1 ? `?page=${page - 1}` : undefined}
            className={`px-4 py-2 rounded-lg border ${
              page > 1
                ? "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                : "border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            Previous
          </a>

          {/* Page Numbers */}
          <div className="flex gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              // Show pages around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <a
                  key={pageNum}
                  href={`?page=${pageNum}`}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                    pageNum === page
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {pageNum}
                </a>
              );
            })}
          </div>

          {/* Next */}
          <a
            href={page < totalPages ? `?page=${page + 1}` : undefined}
            className={`px-4 py-2 rounded-lg border ${
              page < totalPages
                ? "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                : "border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            Next
          </a>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
