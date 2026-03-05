"use client";

import { useMemo, useState } from "react";
import type { Listing } from "@/lib/listings";
import { ListingSection } from "./ListingSection";

interface TierSectionContainerProps {
  listings: Listing[];
}

const ITEMS_PER_PAGE = {
  top: 2,
  middle: 3,
  free: 4,
  unclaimed: 6,
};

const GRID_COLS = {
  top: "md:grid-cols-2 lg:grid-cols-2",
  middle: "md:grid-cols-3 lg:grid-cols-3",
  free: "md:grid-cols-3 lg:grid-cols-4",
  unclaimed: "md:grid-cols-5 lg:grid-cols-6",
};

const TIER_INFO = {
  top: {
    title: "Featured Providers",
    description: "Highly recommended and verified service providers",
    icon: "⭐",
  },
  middle: {
    title: "Verified Providers",
    description: "Trusted businesses with verified credentials",
    icon: "✓",
  },
  free: {
    title: "Service Providers",
    description: "Browse more service providers in your area",
    icon: "📋",
  },
  unclaimed: {
    title: "Claim Your Business",
    description: "Don't see your business? Claim and manage your listing",
    icon: "🏢",
  },
};

export function TierSectionContainer({ listings }: TierSectionContainerProps) {
  // Group listings by tier
  const groupedListings = useMemo(() => {
    const groups = {
      top: [] as Listing[],
      middle: [] as Listing[],
      free: [] as Listing[],
      unclaimed: [] as Listing[],
    };

    listings.forEach((listing) => {
      if (listing.isUnclaimed) {
        groups.unclaimed.push(listing);
      } else {
        const tier = listing.effectiveTier;
        if (tier === "top") groups.top.push(listing);
        else if (tier === "middle") groups.middle.push(listing);
        else groups.free.push(listing);
      }
    });

    return groups;
  }, [listings]);

  // Pagination state for each tier
  const [currentPages, setCurrentPages] = useState({
    top: 1,
    middle: 1,
    free: 1,
    unclaimed: 1,
  });

  const handlePageChange = (
    tier: "top" | "middle" | "free" | "unclaimed",
    newPage: number
  ) => {
    setCurrentPages((prev) => ({ ...prev, [tier]: newPage }));
    // Scroll to section
    const element = document.getElementById(`tier-section-${tier}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Paginate listings
  const paginatedListings = useMemo(() => {
    const result = {
      top: [] as Listing[],
      middle: [] as Listing[],
      free: [] as Listing[],
      unclaimed: [] as Listing[],
    };

    (["top", "middle", "free", "unclaimed"] as const).forEach((tier) => {
      const itemsPerPage = ITEMS_PER_PAGE[tier];
      const page = currentPages[tier];
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      result[tier] = groupedListings[tier].slice(start, end);
    });

    return result;
  }, [groupedListings, currentPages]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return {
      top: Math.ceil(groupedListings.top.length / ITEMS_PER_PAGE.top),
      middle: Math.ceil(groupedListings.middle.length / ITEMS_PER_PAGE.middle),
      free: Math.ceil(groupedListings.free.length / ITEMS_PER_PAGE.free),
      unclaimed: Math.ceil(
        groupedListings.unclaimed.length / ITEMS_PER_PAGE.unclaimed
      ),
    };
  }, [groupedListings]);

  return (
    <div className="space-y-16 lg:space-y-20">
      {/* Top Tier Section */}
      {groupedListings.top.length > 0 && (
        <ListingSection
          id="tier-section-top"
          tier="top"
          title={TIER_INFO.top.title}
          description={TIER_INFO.top.description}
          icon={TIER_INFO.top.icon}
          listings={paginatedListings.top}
          totalListings={groupedListings.top.length}
          currentPage={currentPages.top}
          totalPages={totalPages.top}
          gridCols={GRID_COLS.top}
          itemsPerPage={ITEMS_PER_PAGE.top}
          onPageChange={(page) => handlePageChange("top", page)}
        />
      )}

      {/* Middle Tier Section */}
      {groupedListings.middle.length > 0 && (
        <ListingSection
          id="tier-section-middle"
          tier="middle"
          title={TIER_INFO.middle.title}
          description={TIER_INFO.middle.description}
          icon={TIER_INFO.middle.icon}
          listings={paginatedListings.middle}
          totalListings={groupedListings.middle.length}
          currentPage={currentPages.middle}
          totalPages={totalPages.middle}
          gridCols={GRID_COLS.middle}
          itemsPerPage={ITEMS_PER_PAGE.middle}
          onPageChange={(page) => handlePageChange("middle", page)}
        />
      )}

      {/* Free Tier Section */}
      {groupedListings.free.length > 0 && (
        <ListingSection
          id="tier-section-free"
          tier="free"
          title={TIER_INFO.free.title}
          description={TIER_INFO.free.description}
          icon={TIER_INFO.free.icon}
          listings={paginatedListings.free}
          totalListings={groupedListings.free.length}
          currentPage={currentPages.free}
          totalPages={totalPages.free}
          gridCols={GRID_COLS.free}
          itemsPerPage={ITEMS_PER_PAGE.free}
          onPageChange={(page) => handlePageChange("free", page)}
        />
      )}

      {/* Unclaimed Tier Section */}
      {groupedListings.unclaimed.length > 0 && (
        <ListingSection
          id="tier-section-unclaimed"
          tier="unclaimed"
          title={TIER_INFO.unclaimed.title}
          description={TIER_INFO.unclaimed.description}
          icon={TIER_INFO.unclaimed.icon}
          listings={paginatedListings.unclaimed}
          totalListings={groupedListings.unclaimed.length}
          currentPage={currentPages.unclaimed}
          totalPages={totalPages.unclaimed}
          gridCols={GRID_COLS.unclaimed}
          itemsPerPage={ITEMS_PER_PAGE.unclaimed}
          onPageChange={(page) => handlePageChange("unclaimed", page)}
        />
      )}

      {/* Empty State */}
      {Object.values(groupedListings).every((arr) => arr.length === 0) && (
        <div className="text-center py-20">
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
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
}

export default TierSectionContainer;
