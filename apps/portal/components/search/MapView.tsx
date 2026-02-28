"use client";

import { Listing } from "@/lib/listings";
import { useMemo } from "react";
import Link from "next/link";
import "@/styles/mapbox-gl.css";
import { Map, Marker } from "@listing-platform/maps";

interface MapViewProps {
  listings: Listing[];
  selectedListingId?: string;
  onListingSelect?: (listing: Listing) => void;
}

interface ListingWithCoords extends Listing {
  location: { lat: number; lng: number; city?: string } | undefined;
}

function getCenterAndZoom(listings: ListingWithCoords[]) {
  const withCoords = listings.filter(
    (l) => l.location && typeof l.location === "object" && "lat" in l.location && "lng" in l.location
  );
  if (withCoords.length === 0) return null;
  const locs = withCoords.map((l) => l.location!);
  const lats = locs.map((l) => l.lat);
  const lngs = locs.map((l) => l.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const span = Math.max(latSpan, lngSpan, 0.01);
  const zoom = span < 0.01 ? 14 : span < 0.05 ? 12 : span < 0.2 ? 10 : 9;
  return { center: { lat, lng }, zoom };
}

export function MapView({ listings, selectedListingId, onListingSelect }: MapViewProps) {
  const hasToken = typeof process !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const listingsWithCoords = useMemo(() => {
    return (listings as ListingWithCoords[]).filter(
      (l) =>
        l.location &&
        typeof l.location === "object" &&
        "lat" in l.location &&
        "lng" in l.location &&
        typeof (l.location as { lat?: number }).lat === "number" &&
        typeof (l.location as { lng?: number }).lng === "number"
    );
  }, [listings]);

  const centerZoom = useMemo(() => getCenterAndZoom(listingsWithCoords), [listingsWithCoords]);
  const showRealMap = hasToken && centerZoom && listingsWithCoords.length > 0;

  if (listings.length === 0) {
    return (
      <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 font-medium">No listings found</p>
      </div>
    );
  }

  if (!showRealMap) {
    return (
      <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm font-medium">
            {!hasToken
              ? "Set NEXT_PUBLIC_MAPBOX_TOKEN to show the map"
              : listingsWithCoords.length === 0
                ? "Add addresses to listings to see them on the map"
                : "Map unavailable"}
          </p>
        </div>
      </div>
    );
  }

  const { center, zoom } = centerZoom;

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 relative">
      <Map
        center={center}
        zoom={zoom}
        provider="mapbox"
        apiKey={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        className="absolute inset-0 w-full h-full"
        interactive={true}
        showControls={true}
      >
        {listingsWithCoords.map((listing) => {
          const loc = listing.location as { lat: number; lng: number };
          return (
            <Marker
              key={listing.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              title={listing.title}
            />
          );
        })}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 z-20">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Service Provider</span>
          </div>
        </div>
      </div>

      {/* Selected Listing Preview */}
      {selectedListingId && (
        <div className="absolute top-4 right-4 max-w-sm z-20">
          {listings
            .filter((l) => l.id === selectedListingId)
            .map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.slug}`}>
                <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
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
                    {listing.price && (
                      <div className="absolute top-3 right-3 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        From £{listing.price}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {listing.title}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <span>📍</span>
                        <span className="text-sm">
                          {listing.location &&
                            typeof listing.location === "object" &&
                            "city" in listing.location
                            ? (listing.location as { city?: string }).city
                            : "Location"}
                        </span>
                      </div>
                    </div>
                    {listing.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {listing.description}
                      </p>
                    )}
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

      {/* Listing list overlay for selection - minimal, since markers are on map */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20 max-w-xs">
        {listingsWithCoords.slice(0, 5).map((listing) => (
          <button
            key={listing.id}
            onClick={() => onListingSelect?.(listing)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              selectedListingId === listing.id
                ? "bg-orange-600 text-white"
                : "bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30"
            }`}
          >
            {listing.title}
          </button>
        ))}
      </div>
    </div>
  );
}
