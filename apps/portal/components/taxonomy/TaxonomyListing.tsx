"use client";

import Image from "next/image";
import type { TaxonomyConfig } from "@listing-platform/config";
import type { Listing } from "@/lib/listings";
import { isFeatureEnabled } from "@/lib/taxonomy-config";

// Conditional SDK imports
import { ReviewsList, RatingDisplay } from "@listing-platform/reviews";
import { Map, Marker } from "@listing-platform/maps";

interface TaxonomyListingProps {
  listing: Listing;
  config: TaxonomyConfig;
}

/**
 * Dynamic listing detail component that adapts features based on taxonomy config
 */
export function TaxonomyListing({ listing, config }: TaxonomyListingProps) {
  const showReviews = isFeatureEnabled(config, "reviews");
  const showMaps = isFeatureEnabled(config, "maps");
  const showBooking = isFeatureEnabled(config, "booking");
  const showInquiry = isFeatureEnabled(config, "inquiry");
  
  const customFields = (listing.customFields || {}) as Record<string, unknown>;
  const location = listing.location as { lat?: number; lng?: number; address?: string } | undefined;
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          {listing.images && listing.images.length > 0 && (
            <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <div className="relative aspect-video">
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              {listing.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 p-2">
                  {listing.images.slice(1, 5).map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden"
                    >
                      <Image
                        src={image}
                        alt={`${listing.title} image ${index + 2}`}
                        fill
                        className="object-cover"
                      />
                      {index === 3 && listing.images.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            +{listing.images.length - 5} more
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Title and Rating */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {listing.title}
            </h1>
            
            {/* Dynamic Fields Display */}
            <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
              {config.listingFields
                .filter((field) => field.displayInCard && customFields[field.key])
                .map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{field.label}:</span>
                    <span className="font-medium">
                      {formatFieldValue(customFields[field.key], field.type)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Description */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>
          
          {/* Custom Fields Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {config.listingFields
                .filter((field) => customFields[field.key] && !field.displayInCard)
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      {field.label}
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatFieldValue(customFields[field.key], field.type)}
                    </dd>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Map Section */}
          {showMaps && location?.lat && location?.lng && (
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold p-6 pb-0 text-gray-900 dark:text-white">
                Location
              </h2>
              {location.address && (
                <p className="px-6 pt-2 text-gray-600 dark:text-gray-300">
                  {location.address}
                </p>
              )}
              <div className="h-[300px] mt-4">
                <Map
                  center={{ lat: location.lat, lng: location.lng }}
                  zoom={14}
                  className="w-full h-full"
                  interactive={true}
                  showControls={true}
                >
                  <Marker
                    position={{ lat: location.lat, lng: location.lng }}
                    title={listing.title}
                  />
                </Map>
              </div>
              {/* Nearby Places */}
              {/* TODO: Implement nearby places fetching and pass places array to NearbyPlaces component */}
              {/* <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="font-medium mb-4 text-gray-900 dark:text-white">
                  Nearby
                </h3>
                <NearbyPlaces places={[]} />
              </div> */}
            </div>
          )}
          
          {/* Reviews Section */}
          {showReviews && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Reviews
                </h2>
                <RatingDisplay 
                  rating={(listing as unknown as { rating_average?: number }).rating_average || 0} 
                  showNumber
                />
              </div>
              <ReviewsList listingId={listing.id} variant="default" />
            </div>
          )}
        </div>
        
        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          {listing.price !== undefined && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(listing.price)}
              </div>
              {customFields.pricing_type ? (
                <p className="text-gray-500 dark:text-gray-400">
                  {formatFieldValue(customFields.pricing_type, "select")}
                </p>
              ) : null}
            </div>
          )}
          
          {/* Contact/Inquiry Card */}
          {showInquiry && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Contact
              </h3>
              
              {customFields.phone ? (
                <a
                  href={`tel:${String(customFields.phone)}`}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <PhoneIcon className="w-5 h-5" />
                  <span>{String(customFields.phone)}</span>
                </a>
              ) : null}
              
              {customFields.email ? (
                <a
                  href={`mailto:${String(customFields.email)}`}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <EmailIcon className="w-5 h-5" />
                  <span>{String(customFields.email)}</span>
                </a>
              ) : null}
              
              {customFields.website ? (
                <a
                  href={String(customFields.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <WebsiteIcon className="w-5 h-5" />
                  <span>Visit Website</span>
                </a>
              ) : null}
              
              <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                Send Inquiry
              </button>
            </div>
          )}
          
          {/* Booking Card */}
          {showBooking && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                Book Now
              </h3>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                Check Availability
              </button>
            </div>
          )}
          
          {/* Share Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
              Share
            </h3>
            <div className="flex gap-3">
              <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg transition-colors">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatFieldValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return "-";
  
  if (type === "number") {
    return new Intl.NumberFormat().format(Number(value));
  }
  
  if (type === "multiselect" && Array.isArray(value)) {
    return value.join(", ");
  }
  
  if (type === "boolean") {
    return value ? "Yes" : "No";
  }
  
  return String(value);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Icons
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function WebsiteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

export default TaxonomyListing;

