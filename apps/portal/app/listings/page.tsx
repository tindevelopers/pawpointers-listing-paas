import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { SearchBar, SearchResults } from "@/components/search";
import { searchListings, getCategories } from "@/lib/listings";

/**
 * Listings Browse Page
 *
 * CUSTOMIZE: Update page title, description, and featured categories for your vertical
 */

// CUSTOMIZE: Update metadata for your listing type
export const metadata: Metadata = {
  title: "Browse Listings | Listing Platform",
  description: "Browse all available listings. Find exactly what you're looking for.",
};

interface ListingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const category = typeof params.category === "string" ? params.category : undefined;

  // Fetch listings
  const { listings, total, totalPages } = await searchListings({
    page,
    category,
    limit: 12,
  });

  // Fetch categories for quick filters
  const categories = await getCategories();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {/* CUSTOMIZE: Update heading for your vertical */}
            Browse Listings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {/* CUSTOMIZE: Update description */}
            Discover the best listings available now.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-12 bg-gray-200 rounded-lg animate-pulse" />}>
            <SearchBar
              placeholder="Search listings..."
              showFiltersButton={false}
            />
          </Suspense>
        </div>

        {/* Category Quick Filters */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/listings"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !category
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/listings?category=${cat.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === cat.slug
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {cat.name} ({cat.count})
              </Link>
            ))}
          </div>
        )}

        {/* Results */}
        <SearchResults
          listings={listings}
          total={total}
          page={page}
          totalPages={totalPages}
        />
      </main>

      <Footer />
    </div>
  );
}
