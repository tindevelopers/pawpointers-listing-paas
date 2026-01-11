import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { SearchBar } from "@/components/search";
import { ListingCard } from "@/components/listings";
import { AccountCard } from "@/components/accounts/AccountCard";
import { getFeaturedListings, getCategories, type Listing } from "@/lib/listings";
import { getFeaturedAccounts, type FeaturedAccount } from "@/lib/accounts";

/**
 * Home Page / Landing Page
 *
 * CUSTOMIZE: Update hero section, featured content, and CTAs for your vertical
 * - Real estate: Property search hero, featured neighborhoods
 * - Services: Service categories, how it works section
 * - Directory: Business categories, location-based search
 */

// CUSTOMIZE: Update metadata for your platform
export const metadata: Metadata = {
  title: "Listing Platform - Find What You're Looking For",
  description:
    "Discover the best listings on our platform. Search, browse, and find exactly what you need.",
};

// Force dynamic rendering to avoid build-time API failures
export const dynamic = 'force-dynamic';
export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function HomePage() {
  // Fetch featured listings for homepage
  let featuredListings: Listing[] = [];
  let categories: Array<{ slug: string; name: string; count: number }> = [];
  let featuredAccounts: FeaturedAccount[] = [];
  
  try {
    featuredListings = await getFeaturedListings(6);
  } catch (error) {
    console.error('Error fetching featured listings:', error);
    // Return empty array on error - page will still render
  }
  
  try {
    categories = await getCategories();
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return empty array on error - page will still render
  }
  
  try {
    featuredAccounts = await getFeaturedAccounts(4);
  } catch (error) {
    console.error('Error fetching featured accounts:', error);
    // Return empty array on error - page will still render
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Warm & Friendly */}
        <section className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-cyan-500 text-white py-20 lg:py-32 overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-4 inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                ✨ Find Your Perfect Service Provider
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg">
                Discover Amazing Services Near You
              </h1>
              <p className="text-lg lg:text-xl text-white/90 mb-10 drop-shadow-md">
                Connect with trusted professionals and get the help you need. Browse, compare, and book with confidence.
              </p>

              {/* Hero Search */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-2xl">
                  <SearchBar
                    placeholder="Search services, professions, or providers..."
                    showFiltersButton={false}
                    className="bg-transparent"
                  />
                </div>
              </div>

              {/* Trust Signals */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-white/90 mb-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span><strong>4.8/5</strong> avg rating</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <span><strong>10,000+</strong> providers</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  <span><strong>Verified & Trusted</strong></span>
                </div>
              </div>

              {/* Quick Category Links */}
              {categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="text-white/80 text-sm font-medium w-full mb-2">Popular services:</span>
                  {categories.slice(0, 6).map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:scale-105"
                    >
                      {cat.name}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decorative Shape */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
            >
              <path
                d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                className="fill-white dark:fill-gray-900"
              />
            </svg>
          </div>
        </section>

        {/* Featured Listings */}
        {featuredListings.length > 0 && (
          <section className="py-16 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {/* CUSTOMIZE: Update section title */}
                  Featured Listings
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  {/* CUSTOMIZE: Update section description */}
                  Check out our top picks and most popular listings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              <div className="text-center mt-10">
                <Link
                  href="/listings"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  View All Listings
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {/* CUSTOMIZE: Update section title */}
                  Browse by Category
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  {/* CUSTOMIZE: Update section description */}
                  Find listings organized by category.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700"
                  >
                    {/* CUSTOMIZE: Add category icons */}
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {cat.count} listings
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Accounts Showcase */}
        {featuredAccounts.length > 0 && (
          <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Featured Accounts
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Discover businesses and organizations using our platform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How It Works / Value Proposition */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {/* CUSTOMIZE: Update section title */}
                How It Works
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {/* CUSTOMIZE: Update section description */}
                Getting started is easy. Follow these simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* CUSTOMIZE: Update steps for your vertical */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    1
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Search
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Use our powerful search to find exactly what you need.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    2
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Compare
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Browse listings and compare options side by side.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    3
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Connect
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Reach out and connect with sellers directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-blue-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              {/* CUSTOMIZE: Update CTA headline */}
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {/* CUSTOMIZE: Update CTA description */}
              Join thousands of users who have found what they&apos;re looking for.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Create Account
              </Link>
              <Link
                href="/listings"
                className="bg-blue-700 text-white hover:bg-blue-800 font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Browse Listings
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
