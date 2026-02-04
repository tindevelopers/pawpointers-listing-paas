"use client";

import { useState } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Paw Pointers";

/**
 * Categories Index Page with Subcategories
 * Lists all available categories and their subcategories
 */

// PawPointers Categories with subcategories
const CATEGORIES = [
  {
    id: "pet-care-services",
    name: "Pet Care Services",
    emoji: "🐾",
    bgColor: "from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20",
    iconBg: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400",
    subcategories: ["Dog Walking", "Pet Sitting", "Pet Boarding", "Daycare"],
  },
  {
    id: "health-wellness",
    name: "Health and Wellness",
    emoji: "❤️",
    bgColor: "from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20",
    iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
    subcategories: ["Veterinarian", "Spa & Massage", "Nutrition", "Pet Pharmacy"],
  },
  {
    id: "training-behavior",
    name: "Training and Behavior",
    emoji: "🎯",
    bgColor: "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20",
    iconBg: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400",
    subcategories: ["Dog Training", "Behavior Consulting", "Obedience Classes", "Puppy Training"],
  },
  {
    id: "pet-grooming",
    name: "Pet Grooming",
    emoji: "✨",
    bgColor: "from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-800/20",
    iconBg: "bg-pink-100 dark:bg-pink-900",
    iconColor: "text-pink-600 dark:text-pink-400",
    subcategories: ["Full Grooming", "Bath & Wash", "Nail Trimming", "De-shedding", "Special Styling"],
  },
  {
    id: "pet-retail",
    name: "Pet Retail",
    emoji: "🛍️",
    bgColor: "from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20",
    iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
    subcategories: ["Pet Supplies", "Food & Nutrition", "Toys & Accessories", "Pet Fashion"],
  },
  {
    id: "specialist-services",
    name: "Specialist Pet Services",
    emoji: "⭐",
    bgColor: "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
    subcategories: ["Pet Photography", "Pet Taxi/Transportation", "Training Facility", "Boarding Facility"],
  },
  {
    id: "rescue-community",
    name: "Rescue & Community",
    emoji: "🤝",
    bgColor: "from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-800/20",
    iconBg: "bg-teal-100 dark:bg-teal-900",
    iconColor: "text-teal-600 dark:text-teal-400",
    subcategories: ["Rescue Organization", "Foster Network", "Adoption Services", "Community Support"],
  },
  {
    id: "events-experiences",
    name: "Events & Experiences",
    emoji: "🎉",
    bgColor: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20",
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    subcategories: ["Pet Classes", "Workshops", "Social Events", "Parties & Celebrations"],
  },
];

// CategoryCard Component with expandable subcategories
function CategoryCard({
  category,
}: {
  category: (typeof CATEGORIES)[0];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-gradient-to-br ${category.bgColor} rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700`}
    >
      {/* Main Category Section */}
      <div className="p-6">
        <div className="text-center mb-4">
          <div
            className={`w-16 h-16 ${category.iconBg} rounded-xl flex items-center justify-center mx-auto mb-4 text-4xl`}
          >
            {category.emoji}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {category.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {category.subcategories.length} specialties available
          </p>
        </div>

        {/* View Details Button */}
        <Link
          href={`/categories/${category.id}`}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-center block mb-3 ${category.iconColor} border-2 border-current hover:opacity-80`}
        >
          Browse Services
        </Link>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-4 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          {isExpanded ? "Hide Specialties ▲" : "Show Specialties ▼"}
        </button>
      </div>

      {/* Expandable Subcategories Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Specialties in this category:
          </p>
          <div className="space-y-2">
            {category.subcategories.map((subcat) => (
              <div
                key={subcat}
                className="flex items-start gap-3 p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className={`text-lg mt-0.5 flex-shrink-0`}>
                  →
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  {subcat}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
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
            <li className="text-gray-900 dark:text-white">Categories</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Browse by Category
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Explore {CATEGORIES.length} service categories and find the perfect pet professional for your needs.
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-900 dark:text-blue-200 text-sm">
            <strong>💡 Tip:</strong> Click "Show Specialties" to see the specific services available in each category,
            then click "Browse Services" to find local providers.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        {/* Alternative Display Options Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Other Ways to Browse
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/search"
              className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔍 Search by Keywords</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Search for specific services or pet professionals by name or specialty.
              </p>
            </Link>
            <Link
              href="/listings"
              className="p-4 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📋 View All Listings</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Browse all service providers and businesses in one comprehensive list.
              </p>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-orange-50 to-cyan-50 dark:from-orange-900/20 dark:to-cyan-900/20 rounded-xl p-8 border border-orange-200 dark:border-orange-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            🐾 Didn't find what you need?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {PLATFORM_NAME} is constantly growing! If you can't find a specific service, try using our search feature
            or contact us to suggest a new category.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Home
            </Link>
            <Link
              href="/contact"
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium rounded-lg transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
