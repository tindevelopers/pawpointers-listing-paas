"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { SearchBar, FilterPanel, SearchResults } from "@/components/search";
import { MapView } from "@/components/search/MapView";
import { searchListings, type Listing, type ListingSearchParams } from "@/lib/listings";

/**
 * Search Page
 *
 * CUSTOMIZE: Add advanced search options specific to your listing vertical
 * - Real estate: Map view toggle, saved searches
 * - Services: Date/time pickers, service type filters
 * - Directory: Near me button, ratings filter
 */

function SearchContent() {
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Perform search when params change
  const performSearch = async () => {
    setIsLoading(true);

    const params: ListingSearchParams = {
      query: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      location: searchParams.get("location") || undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: 12,
    };

    try {
      const result = await searchListings(params);
      setListings(result.listings);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
      setListings([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search if there are params - use useEffect to avoid calling during render
  useEffect(() => {
    const searchQuery = searchParams.get("q");
    const hasSearchParams = searchParams.toString().length > 0;
    
    if (hasSearchParams && !hasSearched) {
      performSearch();
    }
    // Reset search state when query changes
    if (hasSearched && searchQuery !== searchParams.get("q")) {
      setHasSearched(false);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = searchParams.get("q");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {/* CUSTOMIZE: Update heading */}
            Search Listings
          </h1>
          {query && (
            <p className="text-gray-600 dark:text-gray-400">
              Results for &quot;{query}&quot;
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar
            placeholder="What are you looking for?"
            showFiltersButton={true}
            onFiltersClick={() => setIsFilterOpen(true)}
          />
        </div>

        {/* Active Filters Display */}
        {(searchParams.get("category") ||
          searchParams.get("minPrice") ||
          searchParams.get("maxPrice") ||
          searchParams.get("location")) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {searchParams.get("category") && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                Category: {searchParams.get("category")}
                <a
                  href={`/search?${new URLSearchParams(
                    Object.fromEntries(
                      [...searchParams.entries()].filter(([k]) => k !== "category")
                    )
                  ).toString()}`}
                  className="ml-1 hover:text-blue-600"
                >
                  ×
                </a>
              </span>
            )}
            {searchParams.get("location") && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                Location: {searchParams.get("location")}
                <a
                  href={`/search?${new URLSearchParams(
                    Object.fromEntries(
                      [...searchParams.entries()].filter(([k]) => k !== "location")
                    )
                  ).toString()}`}
                  className="ml-1 hover:text-blue-600"
                >
                  ×
                </a>
              </span>
            )}
            {(searchParams.get("minPrice") || searchParams.get("maxPrice")) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                Price: ${searchParams.get("minPrice") || "0"} - $
                {searchParams.get("maxPrice") || "∞"}
                <a
                  href={`/search?${new URLSearchParams(
                    Object.fromEntries(
                      [...searchParams.entries()].filter(
                        ([k]) => k !== "minPrice" && k !== "maxPrice"
                      )
                    )
                  ).toString()}`}
                  className="ml-1 hover:text-blue-600"
                >
                  ×
                </a>
              </span>
            )}
          </div>
        )}

        {/* View Toggle */}
        {hasSearched && listings.length > 0 && (
          <div className="mb-6 flex justify-end">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedListingId(null);
                }}
                className={`px-4 py-2 font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                List
              </button>
              <div className="border-l border-gray-300 dark:border-gray-600"></div>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z" />
                </svg>
                Map
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched ? (
          viewMode === 'list' ? (
            <SearchResults
              listings={listings}
              total={total}
              page={page}
              totalPages={totalPages}
              isLoading={isLoading}
            />
          ) : (
            <MapView
              listings={listings}
              selectedListingId={selectedListingId}
              onListingSelect={(listing) => setSelectedListingId(listing.id)}
            />
          )
        ) : (
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
              Start Your Search
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Enter a search term or use filters to find what you&apos;re looking for.
            </p>
          </div>
        )}

        {/* Filter Panel */}
        <FilterPanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
