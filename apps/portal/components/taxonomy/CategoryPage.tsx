"use client";

import Image from "next/image";
import Link from "next/link";
import type { TaxonomyConfig } from "@listing-platform/config";
import type { Listing } from "@/lib/listings";
import type { TaxonomyTerm } from "@/lib/taxonomy";
import { ListingCard } from "@/components/listings";

interface CategoryPageProps {
  term: TaxonomyTerm;
  listings: Listing[];
  config: TaxonomyConfig;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Category/Taxonomy term page component
 * Displays a list of listings for a specific taxonomy term
 */
export function CategoryPage({
  term,
  listings,
  config,
  pagination,
}: CategoryPageProps) {
  const { total, page, totalPages } = pagination;
  
  return (
    <div className="space-y-8">
      {/* Category Header */}
      <div className="relative">
        {term.image && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <Image
              src={term.image}
              alt={term.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          </div>
        )}
        
        <div className={`relative py-12 px-8 ${term.image ? "text-white" : "bg-white dark:bg-gray-800 rounded-2xl shadow-sm"}`}>
          <h1 className={`text-4xl font-bold mb-4 ${!term.image && "text-gray-900 dark:text-white"}`}>
            {term.name}
          </h1>
          
          {term.description && (
            <p className={`text-lg max-w-2xl ${term.image ? "text-gray-200" : "text-gray-600 dark:text-gray-300"}`}>
              {term.description}
            </p>
          )}
          
          <div className={`mt-4 text-sm ${term.image ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
            {total} {total === 1 ? config.primaryTaxonomy.labels.singular : config.primaryTaxonomy.labels.plural}
          </div>
          
          {/* Child Categories */}
          {term.children && term.children.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {term.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/${child.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    term.image
                      ? "bg-white/20 hover:bg-white/30 text-white"
                      : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {child.name}
                  {child.listingCount > 0 && (
                    <span className="ml-2 opacity-70">({child.listingCount})</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {listings.length} of {total} results
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <select className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="relevance">Most Relevant</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
          
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
            <button className="p-2 rounded-md bg-white dark:bg-gray-600 shadow-sm">
              <GridIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors">
              <ListIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Listings Grid */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState term={term} config={config} />
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}

function EmptyState({
  term,
  config,
}: {
  term: TaxonomyTerm;
  config: TaxonomyConfig;
}) {
  return (
    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <EmptyIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No listings found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        We don&apos;t have any listings in {term.name} yet. Check back soon or explore other categories.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Browse All {config.primaryTaxonomy.labels.plural}
      </Link>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const pages = generatePageNumbers(currentPage, totalPages);
  
  return (
    <nav className="flex items-center justify-center gap-2">
      <button
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      
      {pages.map((pageNum, index) =>
        pageNum === "..." ? (
          <span key={`ellipsis-${index}`} className="px-3 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={pageNum}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              pageNum === currentPage
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {pageNum}
          </button>
        )
      )}
      
      <button
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </nav>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  
  return [1, "...", current - 1, current, current + 1, "...", total];
}

// Icons
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

export default CategoryPage;

