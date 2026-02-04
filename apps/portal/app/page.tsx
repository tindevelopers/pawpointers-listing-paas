import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { SearchBar } from "@/components/search";
import { AIChat } from "@/components/chat";
import { ListingCard } from "@/components/listings";
import { AccountCard } from "@/components/accounts/AccountCard";
import { getFeaturedListings, getCategories, type Listing } from "@/lib/listings";
import { getFeaturedAccounts, type FeaturedAccount } from "@/lib/accounts";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";

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
  title: `${PLATFORM_NAME} - Find What You're Looking For`,
  description:
    `Discover the best listings on ${PLATFORM_NAME}. Search, browse, and find exactly what you need.`,
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
        <section className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-cyan-500 text-white py-16 lg:py-24 overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Header Content */}
              <div className="text-center mb-12">
                <div className="mb-4 inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                  ✨ Find Your Perfect Service Provider
                </div>

                <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg">
                  Discover Amazing Services Near You
                </h1>
                <p className="text-lg lg:text-xl text-white/90 drop-shadow-md max-w-2xl mx-auto">
                  Connect with trusted professionals and get the help you need. Browse, compare, and book with confidence.
                </p>
              </div>

              {/* AI Chat - Center Stage */}
              <div className="mb-12">
                <AIChat />
              </div>

              {/* Trust Signals */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-white/90">
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
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Browse by Category
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Find listings organized by category.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                {
                  slug: 'pet-care-services',
                  name: 'Pet Care Services',
                  bgColor: 'bg-orange-100 dark:bg-orange-900',
                  iconColor: 'text-orange-600 dark:text-orange-400',
                  emoji: '🐾'
                },
                {
                  slug: 'health-wellness',
                  name: 'Health and Wellness',
                  bgColor: 'bg-green-100 dark:bg-green-900',
                  iconColor: 'text-green-600 dark:text-green-400',
                  emoji: '❤️'
                },
                {
                  slug: 'training-behavior',
                  name: 'Training and Behavior',
                  bgColor: 'bg-purple-100 dark:bg-purple-900',
                  iconColor: 'text-purple-600 dark:text-purple-400',
                  emoji: '🎯'
                },
                {
                  slug: 'pet-retail',
                  name: 'Pet Retail',
                  bgColor: 'bg-pink-100 dark:bg-pink-900',
                  iconColor: 'text-pink-600 dark:text-pink-400',
                  emoji: '🛍️'
                },
                {
                  slug: 'specialist-services',
                  name: 'Specialist Pet Services',
                  bgColor: 'bg-blue-100 dark:bg-blue-900',
                  iconColor: 'text-blue-600 dark:text-blue-400',
                  emoji: '⭐'
                },
                {
                  slug: 'rescue-community',
                  name: 'Rescue & Community',
                  bgColor: 'bg-teal-100 dark:bg-teal-900',
                  iconColor: 'text-teal-600 dark:text-teal-400',
                  emoji: '🤝'
                },
                {
                  slug: 'events-experiences',
                  name: 'Events & Experiences',
                  bgColor: 'bg-amber-100 dark:bg-amber-900',
                  iconColor: 'text-amber-600 dark:text-amber-400',
                  emoji: '🎉'
                },
              ].map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center hover:shadow-lg hover:scale-105 transition-all border border-gray-100 dark:border-gray-700"
                >
                  <div className={`w-16 h-16 ${cat.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl`}>
                    {cat.emoji}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {cat.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>

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

        {/* How It Works / Value Proposition - Services Focus */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Easy as 1, 2, 3
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                Find the right professional and book your service in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1: Search */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Search Services
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Find exactly what you need by service type, location, or provider expertise.
                </p>
              </div>

              {/* Arrow - Desktop Only */}
              <div className="hidden md:flex items-center justify-center">
                <div className="text-orange-400 text-3xl">→</div>
              </div>

              {/* Step 2: Compare */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Review & Compare
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Check ratings, reviews, availability, and pricing to make the best choice.
                </p>
              </div>

              {/* Arrow - Desktop Only */}
              <div className="hidden md:flex items-center justify-center">
                <div className="text-cyan-400 text-3xl">→</div>
              </div>

              {/* Step 3: Book */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Book & Connect
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Instantly book your service or message the provider to finalize details.
                </p>
              </div>
            </div>

            {/* Key Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center card-shadow hover:card-shadow-lg transition-all">
                <div className="text-3xl mb-3">⭐</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Verified Reviews</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Authentic feedback from real customers</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center card-shadow hover:card-shadow-lg transition-all">
                <div className="text-3xl mb-3">🛡️</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trusted Providers</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Verified and vetted professionals</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center card-shadow hover:card-shadow-lg transition-all">
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Quick Booking</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Instant confirmation and scheduling</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center card-shadow hover:card-shadow-lg transition-all">
                <div className="text-3xl mb-3">💬</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Direct Messaging</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Communicate directly with providers</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Service Booking Focus */}
        <section className="py-16 lg:py-24 bg-gradient-to-r from-orange-500 to-cyan-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Ready to Find Your Perfect Service Provider?
            </h2>
            <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
              Join thousands of satisfied customers and get professional help when you need it. Browse, compare, and book with confidence today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/listings"
                className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 inline-flex items-center gap-2 justify-center shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Browsing Now
              </Link>
              <Link
                href="/signup"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 border-2 border-white/50 hover:border-white inline-flex items-center gap-2 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
