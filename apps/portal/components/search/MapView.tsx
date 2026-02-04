'use client';

import { Listing } from '@/lib/listings';
import { useState } from 'react';
import Link from 'next/link';

interface MapViewProps {
  listings: Listing[];
  selectedListingId?: string;
  onListingSelect?: (listing: Listing) => void;
}

export function MapView({ listings, selectedListingId, onListingSelect }: MapViewProps) {
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);

  // Generate mock coordinates for pins (in a real app, these would come from data)
  const getCoordinatesForListing = (index: number) => {
    // Create a scattered pattern of pins across the map
    const baseLatitude = 40.7128;
    const baseLongitude = -74.006;
    const latOffset = (index % 5) * 0.01;
    const lngOffset = Math.floor(index / 5) * 0.015;
    
    return {
      lat: baseLatitude + latOffset - 0.02,
      lng: baseLongitude + lngOffset - 0.05,
      x: `${20 + (index % 5) * 15}%`,
      y: `${15 + Math.floor(index / 5) * 20}%`,
    };
  };

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 relative">
      {/* Map Container - Placeholder for actual map integration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700">
        {/* Map background with subtle grid */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" className="text-gray-400">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Map Center Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded">
              Center
            </div>
          </div>
        </div>

        {/* Paw Icon Pins */}
        {listings.map((listing, index) => {
          const coords = getCoordinatesForListing(index);
          const isSelected = selectedListingId === listing.id;
          const isHovered = hoveredListingId === listing.id;

          return (
            <div
              key={listing.id}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group"
              style={{
                left: coords.x,
                top: coords.y,
              }}
              onMouseEnter={() => setHoveredListingId(listing.id)}
              onMouseLeave={() => setHoveredListingId(null)}
              onClick={() => onListingSelect?.(listing)}
            >
              {/* Paw Icon Pin */}
              <div
                className={`flex flex-col items-center transition-all duration-200 ${
                  isSelected || isHovered ? 'scale-125' : 'scale-100'
                }`}
              >
                {/* Pin Icon - Location Pin with Paw */}
                <div
                  className={`relative transition-all duration-200 ${
                    isSelected
                      ? 'text-orange-600 drop-shadow-lg'
                      : isHovered
                      ? 'text-orange-500 drop-shadow-md'
                      : 'text-orange-400 drop-shadow'
                  }`}
                >
                  {/* SVG Location Pin with Paw Icon Inside */}
                  <svg
                    className="w-10 h-10"
                    viewBox="0 0 32 40"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Location pin shape */}
                    <path d="M16 0C8.26801 0 2 6.268 2 14C2 22.8359 16 40 16 40C16 40 30 22.8359 30 14C30 6.268 23.732 0 16 0Z" fill="currentColor" />
                    {/* White background for paw */}
                    <circle cx="16" cy="13" r="6" fill="white" />
                    {/* Paw icon inside pin */}
                    <g transform="translate(16, 13) scale(0.6)">
                      {/* Main pad */}
                      <ellipse cx="0" cy="3" rx="2.5" ry="3" fill="currentColor" />
                      {/* Top left toe */}
                      <ellipse cx="-4" cy="-3" rx="1.5" ry="2.2" fill="currentColor" />
                      {/* Top center-left toe */}
                      <ellipse cx="-1.5" cy="-6" rx="1.5" ry="2.2" fill="currentColor" />
                      {/* Top center-right toe */}
                      <ellipse cx="1.5" cy="-6" rx="1.5" ry="2.2" fill="currentColor" />
                      {/* Top right toe */}
                      <ellipse cx="4" cy="-3" rx="1.5" ry="2.2" fill="currentColor" />
                    </g>
                  </svg>
                </div>

                {/* Label on hover */}
                {isHovered && (
                  <div className="mt-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {listing.title}
                    </p>
                    {listing.price && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        From £{listing.price}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 z-20">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-400" viewBox="0 0 32 40" fill="currentColor">
              {/* Location pin shape */}
              <path d="M16 0C8.26801 0 2 6.268 2 14C2 22.8359 16 40 16 40C16 40 30 22.8359 30 14C30 6.268 23.732 0 16 0Z" fill="currentColor" />
              {/* White background for paw */}
              <circle cx="16" cy="13" r="6" fill="white" />
              {/* Paw icon inside pin */}
              <g transform="translate(16, 13) scale(0.6)">
                {/* Main pad */}
                <ellipse cx="0" cy="3" rx="2.5" ry="3" fill="currentColor" />
                {/* Top left toe */}
                <ellipse cx="-4" cy="-3" rx="1.5" ry="2.2" fill="currentColor" />
                {/* Top center-left toe */}
                <ellipse cx="-1.5" cy="-6" rx="1.5" ry="2.2" fill="currentColor" />
                {/* Top center-right toe */}
                <ellipse cx="1.5" cy="-6" rx="1.5" ry="2.2" fill="currentColor" />
                {/* Top right toe */}
                <ellipse cx="4" cy="-3" rx="1.5" ry="2.2" fill="currentColor" />
              </g>
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400">Service Provider</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">You</span>
          </div>
        </div>
      </div>

      {/* Selected Listing Preview */}
      {selectedListingId && (
        <div className="absolute top-4 right-4 max-w-sm z-20">
          {listings
            .filter((l) => l.id === selectedListingId)
            .map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
                  {/* Image Section */}
                  <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-700 h-40">
                    {listing.images && listing.images[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6m0 0l-1.5-1.5A2 2 0 0017 2H7a2 2 0 00-1.5.5L4 6z" />
                        </svg>
                      </div>
                    )}
                    {/* Price Badge */}
                    {listing.price && (
                      <div className="absolute top-3 right-3 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        From £{listing.price}
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {listing.title}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>📍</span>
                        <span className="text-sm">{listing.location?.city || 'Location'}</span>
                      </div>
                    </div>

                    {/* Description Preview */}
                    {listing.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {listing.description}
                      </p>
                    )}

                    {/* View Details Button */}
                    <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                      <span>View Details</span>
                      <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}

      {/* Empty State */}
      {listings.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.553-.894L9 7.711v12.289z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 20l5.447-2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.553-.894L15 7.711v12.289z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No listings found</p>
        </div>
      )}

      {/* Integration Notice */}
      <div className="absolute top-4 left-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded text-xs font-medium">
        Map integration pending (Mapbox/Google Maps)
      </div>
    </div>
  );
}
