"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header, Footer } from "@/components/layout";

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Paw Pointers";

/**
 * Categories Index Page with Sample Listings
 * Lists all available categories, their subcategories, and sample listings
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

// Placeholder listings data - in production, this would come from your database
const SAMPLE_LISTINGS: Record<string, Array<{id: string; title: string; image: string; location: string; price: number; rating: number; reviewCount: number; type: string; phone: string; services: string[]}>> = {
  "pet-care-services": [
    { id: "1", title: "Professional Dog Walking", image: "https://images.unsplash.com/photo-1601758228606-3b12019ef328?w=400&h=300&fit=crop", location: "Downtown", price: 35, rating: 4.8, reviewCount: 145, type: "Pet Services", phone: "(555) 123-4567", services: ["Dog Walking", "Pet Sitting", "Daycare"] },
    { id: "2", title: "Trusted Pet Sitting Service", image: "https://images.unsplash.com/photo-1587300411107-ec02753dc8b5?w=400&h=300&fit=crop", location: "Midtown", price: 50, rating: 5.0, reviewCount: 89, type: "Pet Services", phone: "(555) 234-5678", services: ["Pet Sitting", "Dog Walking", "Pet Feeding"] },
    { id: "3", title: "Premium Pet Boarding", image: "https://images.unsplash.com/photo-1578572994442-48f1cf4b9899?w=400&h=300&fit=crop", location: "Westside", price: 75, rating: 4.7, reviewCount: 212, type: "Pet Services", phone: "(555) 345-6789", services: ["Pet Boarding", "Daycare", "Grooming"] },
  ],
  "health-wellness": [
    { id: "4", title: "Veterinary Clinic", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop", location: "Medical District", price: 150, rating: 5.0, reviewCount: 324, type: "Pet Services", phone: "(555) 456-7890", services: ["Veterinary Care", "Vaccinations", "Surgery", "Wellness Exams"] },
    { id: "5", title: "Pet Spa & Wellness", image: "https://images.unsplash.com/photo-1628840042765-356cda07f4ee?w=400&h=300&fit=crop", location: "Uptown", price: 85, rating: 4.9, reviewCount: 178, type: "Pet Services", phone: "(555) 567-8901", services: ["Massage", "Spa Treatments", "Acupuncture", "Hydrotherapy"] },
    { id: "6", title: "Nutritionist Consultation", image: "https://images.unsplash.com/photo-1568705846914-96b305d2aaeb?w=400&h=300&fit=crop", location: "Downtown", price: 100, rating: 4.6, reviewCount: 92, type: "Pet Services", phone: "(555) 678-9012", services: ["Nutrition Consulting", "Diet Planning", "Special Diets"] },
  ],
  "training-behavior": [
    { id: "7", title: "Professional Dog Training", image: "https://images.unsplash.com/photo-1633722715463-d30628cbc4c1?w=400&h=300&fit=crop", location: "Central", price: 120, rating: 4.9, reviewCount: 267, type: "Pet Services", phone: "(555) 789-0123", services: ["Dog Training", "Behavior Consulting", "Obedience Classes"] },
    { id: "8", title: "Behavior Specialist", image: "https://images.unsplash.com/photo-1552053831-71594a27c62d?w=400&h=300&fit=crop", location: "Northside", price: 95, rating: 4.8, reviewCount: 156, type: "Pet Services", phone: "(555) 890-1234", services: ["Behavior Consulting", "Aggression Training", "Anxiety Treatment"] },
    { id: "9", title: "Obedience Classes", image: "https://images.unsplash.com/photo-1633722715463-d30628cbc4c1?w=400&h=300&fit=crop", location: "Southside", price: 60, rating: 4.7, reviewCount: 203, type: "Pet Services", phone: "(555) 901-2345", services: ["Obedience Classes", "Puppy Training", "Group Classes"] },
  ],
  "pet-grooming": [
    { id: "10", title: "Premium Pet Grooming Salon", image: "https://images.pexels.com/photos/6816837/pexels-photo-6816837.jpeg?w=400&h=300&fit=crop", location: "Uptown", price: 75, rating: 4.9, reviewCount: 341, type: "Pet Services", phone: "(555) 012-3456", services: ["Full Grooming", "Bath & Wash", "Nail Trimming", "De-shedding"] },
    { id: "11", title: "Express Grooming", image: "https://images.unsplash.com/photo-1530281700549-f282e0e62d16?w=400&h=300&fit=crop", location: "Downtown", price: 55, rating: 4.6, reviewCount: 198, type: "Pet Services", phone: "(555) 111-2222", services: ["Quick Wash", "Nail Trimming", "De-shedding"] },
    { id: "12", title: "Mobile Grooming Service", image: "https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=400&h=300&fit=crop", location: "Citywide", price: 85, rating: 4.8, reviewCount: 127, type: "Pet Services", phone: "(555) 222-3333", services: ["Mobile Grooming", "Full Grooming", "Special Styling"] },
  ],
  "pet-retail": [
    { id: "13", title: "Pet Supply Store", image: "https://images.unsplash.com/photo-1623807917579-a6fca89f5f0d?w=400&h=300&fit=crop", location: "Shopping District", price: 0, rating: 4.7, reviewCount: 276, type: "Retail", phone: "(555) 333-4444", services: ["Pet Supplies", "Toys & Accessories", "Pet Food"] },
    { id: "14", title: "Premium Pet Boutique", image: "https://images.unsplash.com/photo-1608848461950-0fed8e7a9b60?w=400&h=300&fit=crop", location: "Westside", price: 0, rating: 4.9, reviewCount: 189, type: "Retail", phone: "(555) 444-5555", services: ["Pet Fashion", "Luxury Items", "Designer Collars"] },
    { id: "15", title: "Organic Pet Food Store", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4d4b3f4?w=400&h=300&fit=crop", location: "Eastside", price: 0, rating: 5.0, reviewCount: 156, type: "Retail", phone: "(555) 555-6666", services: ["Organic Food", "Natural Treats", "Supplements"] },
  ],
  "specialist-services": [
    { id: "16", title: "Pet Photography Studio", image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop", location: "Arts District", price: 200, rating: 5.0, reviewCount: 94, type: "Pet Services", phone: "(555) 666-7777", services: ["Pet Photography", "Studio Sessions", "Outdoor Shoots"] },
    { id: "17", title: "Pet Transportation", image: "https://images.unsplash.com/photo-1602488113235-8a0b3fa23eb1?w=400&h=300&fit=crop", location: "Citywide", price: 65, rating: 4.7, reviewCount: 112, type: "Pet Services", phone: "(555) 777-8888", services: ["Pet Taxi", "Vet Rides", "Emergency Transport"] },
    { id: "18", title: "Training Academy", image: "https://images.unsplash.com/photo-1633722715463-d30628cbc4c1?w=400&h=300&fit=crop", location: "Industrial Area", price: 150, rating: 4.9, reviewCount: 187, type: "Pet Services", phone: "(555) 888-9999", services: ["Training Classes", "Boarding Facility", "Daycare"] },
  ],
  "rescue-community": [
    { id: "19", title: "City Rescue Organization", image: "https://images.unsplash.com/photo-1541364537049-40949d8aced1?w=400&h=300&fit=crop", location: "Downtown", price: 0, rating: 4.8, reviewCount: 421, type: "Non-profit", phone: "(555) 999-0000", services: ["Rescue Services", "Adoption Services", "Foster Network"] },
    { id: "20", title: "Foster Care Network", image: "https://images.unsplash.com/photo-1587300411107-ec02753dc8b5?w=400&h=300&fit=crop", location: "Community Center", price: 0, rating: 4.9, reviewCount: 238, type: "Non-profit", phone: "(555) 111-3333", services: ["Foster Homes", "Pet Support", "Adoption Support"] },
    { id: "21", title: "Adoption Sanctuary", image: "https://images.unsplash.com/photo-1578572994442-48f1cf4b9899?w=400&h=300&fit=crop", location: "Southside", price: 0, rating: 5.0, reviewCount: 356, type: "Non-profit", phone: "(555) 222-4444", services: ["Adoption Services", "Pet Sanctuary", "Community Support"] },
  ],
  "events-experiences": [
    { id: "22", title: "Dog Training Classes", image: "https://images.unsplash.com/photo-1633722715463-d30628cbc4c1?w=400&h=300&fit=crop", location: "Community Center", price: 45, rating: 4.8, reviewCount: 167, type: "Pet Services", phone: "(555) 333-5555", services: ["Training Classes", "Workshops", "Group Sessions"] },
    { id: "23", title: "Pet Expo Organizer", image: "https://images.unsplash.com/photo-1634036055306-bac2a50f4500?w=400&h=300&fit=crop", location: "Convention Center", price: 25, rating: 4.6, reviewCount: 98, type: "Events", phone: "(555) 444-6666", services: ["Pet Expos", "Event Planning", "Workshops"] },
    { id: "24", title: "Pet Social Meetups", image: "https://images.unsplash.com/photo-1552053831-71594a27c62d?w=400&h=300&fit=crop", location: "Park", price: 0, rating: 4.7, reviewCount: 134, type: "Community", phone: "(555) 555-7777", services: ["Social Events", "Park Meetups", "Community Gatherings"] },
  ],
};

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

// ListingCard Component
function ListingCard({
  listing,
}: {
  listing: (typeof SAMPLE_LISTINGS)[string][0];
}) {
  const stars = Math.floor(listing.rating);
  const hasHalfStar = listing.rating % 1 >= 0.5;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Image Container with Badge */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden group">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
        />
        {/* Available Badge */}
        <div className="absolute top-3 right-3 bg-green-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Available
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-xs">
                {i < stars ? "⭐" : i === stars && hasHalfStar ? "⭐" : "☆"}
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {listing.rating}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({listing.reviewCount})
          </span>
        </div>

        {/* Title */}
        <h4 className="font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 text-sm">
          {listing.title}
        </h4>

        {/* Price and Type */}
        <div className="flex items-center justify-between mb-3">
          <div>
            {listing.price > 0 ? (
              <span className="text-lg font-bold text-orange-500">
                ${listing.price}
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Free
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            {listing.type}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded font-medium">
            Professional
          </span>
        </div>

        {/* Location */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex-1">
          📍 {listing.location}
        </p>

        {/* View Details Link */}
        <Link
          href={`/listings/${listing.id}`}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}

// Category Section with Listings
function CategorySection({
  category,
}: {
  category: (typeof CATEGORIES)[0];
}) {
  const listings = SAMPLE_LISTINGS[category.id] || [];

  return (
    <section className="mb-16">
      {/* Category Header with View All Button */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{category.emoji}</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {category.name}
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Browse {listings.length} featured service providers in this category
          </p>
        </div>
        <Link
          href={`/categories/${category.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 mt-2"
        >
          View All
        </Link>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.slice(0, 3).map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
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

        {/* Featured Listings by Category */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">
            Featured Listings
          </h2>
          {CATEGORIES.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>

        {/* Browse Category Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            All Categories
          </h2>

          {/* Info Box */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-900 dark:text-blue-200 text-sm">
              <strong>💡 Tip:</strong> Click "Show Specialties" to see specific services in each category.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CATEGORIES.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-orange-50 to-cyan-50 dark:from-orange-900/20 dark:to-cyan-900/20 rounded-xl p-8 border border-orange-200 dark:border-orange-800 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            🐾 Looking for something specific?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Use our search feature to find exactly what you need, or browse all listings to discover more {PLATFORM_NAME} partners.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/search"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Search Services
            </Link>
            <Link
              href="/listings"
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium rounded-lg transition-colors"
            >
              View All Listings
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
