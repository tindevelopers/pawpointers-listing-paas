"use client";

import { ListingCard } from "./ListingCard";
import type { Listing } from "@/lib/listings";

interface ListingSectionProps {
  id: string;
  tier: "top" | "middle" | "free" | "unclaimed";
  title: string;
  description: string;
  icon: string;
  listings: Listing[];
  totalListings: number;
  currentPage: number;
  totalPages: number;
  gridCols: string;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const TIER_COLORS = {
  top: {
    badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    title: "text-amber-900 dark:text-amber-50",
    divider: "bg-amber-100 dark:bg-amber-900/30",
  },
  middle: {
    badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    title: "text-blue-900 dark:text-blue-50",
    divider: "bg-blue-100 dark:bg-blue-900/30",
  },
  free: {
    badge: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
    title: "text-green-900 dark:text-green-50",
    divider: "bg-green-100 dark:bg-green-900/30",
  },
  unclaimed: {
    badge: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
    title: "text-orange-900 dark:text-orange-50",
    divider: "bg-orange-100 dark:bg-orange-900/30",
  },
};

export function ListingSection({
  id,
  tier,
  title,
  description,
  icon,
  listings,
  totalListings,
  currentPage,
  totalPages,
  gridCols,
  itemsPerPage,
  onPageChange,
}: ListingSectionProps) {
  const colors = TIER_COLORS[tier];
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalListings);

  return (
    <section id={id} className="scroll-mt-20">
      {/* Section Header */}
      <div className="mb-8">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${colors.badge} mb-4`}>
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            {tier === "top"
              ? "Featured"
              : tier === "middle"
                ? "Verified"
                : tier === "free"
                  ? "Browse More"
                  : "Claim Your Business"}
          </span>
        </div>

        <h2 className={`text-3xl font-bold mb-2 ${colors.title}`}>
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          {description}
        </p>

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
          Showing {startIndex}-{endIndex} of {totalListings} listings
        </p>
      </div>

      {/* Divider */}
      <div className={`h-1 ${colors.divider} rounded-full mb-8`}></div>

      {/* Listings Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6 mb-8`}
      >
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              currentPage === 1
                ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50"
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Previous
          </button>

          {/* Page Numbers */}
          <div className="flex gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    pageNum === currentPage
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              currentPage === totalPages
                ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50"
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export default ListingSection;
