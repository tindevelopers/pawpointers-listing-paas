"use client";

import Link from "next/link";
import Image from "next/image";
import { type Listing, formatPrice } from "@/lib/listings";

/**
 * ListingCard - Enhanced card component for service listings
 *
 * Features:
 * - Service provider information
 * - Rating and review count
 * - Availability status
 * - Price range
 * - Quick action buttons
 */

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className = "" }: ListingCardProps) {
  const primaryImage = listing.images?.[0] || "/images/placeholder-listing.jpg";

  // Mock rating data (would come from API in production)
  const rating = Math.random() * 2 + 3.5; // Random 3.5-5.5
  const reviewCount = Math.floor(Math.random() * 150) + 10; // Random 10-160
  const isAvailable = Math.random() > 0.3; // 70% available

  const renderStars = (rate: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(rate)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600"
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={`group block overflow-hidden rounded-2xl bg-white dark:bg-gray-800 card-shadow hover:card-shadow-lg transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200 dark:bg-gray-700">
        <Image
          src={primaryImage}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Status Badge */}
        {listing.status === "sold" && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Sold
          </div>
        )}

        {/* Availability Badge */}
        <div
          className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${
            isAvailable
              ? "bg-green-400/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {isAvailable ? "Available" : "Full"}
        </div>

        {/* Quick Action Button - Visible on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle quick booking
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Book Now
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle messaging
            }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Rating Section */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {renderStars(rating)}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {rating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({reviewCount})
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-orange-500 transition-colors">
          {listing.title}
        </h3>

        {/* Provider & Location */}
        {listing.location && (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1">
              {[listing.location.city, listing.location.state]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {/* Price and Category Row */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-warm-primary">
            {formatPrice(listing.price)}
          </div>
          {listing.category && (
            <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold px-2.5 py-1 rounded-full">
              {listing.category}
            </span>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Professional</span>
          </div>
          <div className="flex items-center gap-1">
            {isAvailable ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                <span className="availability-available">Available</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
                <span className="availability-unavailable">Fully Booked</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ListingCard;
