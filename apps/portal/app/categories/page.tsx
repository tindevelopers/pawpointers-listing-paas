import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { getCategories } from "@/lib/listings";
import { getTaxonomyConfig } from "@/lib/taxonomy-config";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";

/**
 * Categories Index Page
 * Lists all available categories/professions
 */

export const metadata: Metadata = {
  title: `Categories | ${PLATFORM_NAME}`,
  description: "Browse all categories and professions available on this platform.",
};

// Force dynamic rendering to avoid build-time API failures
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function CategoriesPage() {
  const config = await getTaxonomyConfig();
  let categories: Array<{ slug: string; name: string; count: number }> = [];
  
  try {
    categories = await getCategories();
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return empty array on error - page will still render
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white">
              {config.primaryTaxonomy.labels.plural}
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {config.primaryTaxonomy.labels.plural}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse all available {config.primaryTaxonomy.labels.plural.toLowerCase()} on our platform.
          </p>
        </div>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 group"
              >
                {/* Category Icon */}
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2.25 0 012 2v6a2 2.25 0 01-2 2H5a2 2.25 0 01-2-2v-6a2 2.25 0 012-2m14 0V9a2 2.25 0 00-2-2M5 11V9a2 2.25 0 012-2m0 0V5a2 2.25 0 012-2h6a2 2.25 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cat.count} {cat.count === 1 ? 'listing' : 'listings'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
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
                  d="M19 11H5m14 0a2 2.25 0 012 2v6a2 2.25 0 01-2 2H5a2 2.25 0 01-2-2v-6a2 2.25 0 012-2m14 0V9a2 2.25 0 00-2-2M5 11V9a2 2.25 0 012-2m0 0V5a2 2.25 0 012-2h6a2 2.25 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {config.primaryTaxonomy.labels.plural} Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              We&apos;re currently setting up our categories. Please check back soon or contact us if you need assistance.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Return to Home
            </Link>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try using our search feature or browse all listings to discover more options.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Search Listings
            </Link>
            <Link
              href="/listings"
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
            >
              Browse All Listings
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

