"use client";

import { useEffect, useState } from "react";
import { useGeocode } from "@listing-platform/maps";
import { ListingMap } from "./ListingMap";
import { GetDirectionsButtons } from "./GetDirectionsButtons";
import type { Listing } from "@/lib/listings";

interface LocationTabContentProps {
  listing: Listing;
}

function formatAddress(location: NonNullable<Listing["location"]>): string {
  return [location.address, location.city, location.state, location.country]
    .filter(Boolean)
    .join(", ");
}

export function LocationTabContent({ listing }: LocationTabContentProps) {
  const loc = listing.location;
  const hasCoords = loc && typeof loc.lat === "number" && typeof loc.lng === "number";
  const addressString =
    loc && [loc.address, loc.city, loc.state, loc.country].some(Boolean)
      ? formatAddress(loc)
      : "";

  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { geocode, isLoading: geocodeLoading } = useGeocode({
    provider: "mapbox",
    apiKey: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined,
  });

  // Geocode when we have address but no coords (only once)
  useEffect(() => {
    if (hasCoords || !addressString || geocodedCoords) return;
    let cancelled = false;
    geocode(addressString).then((result) => {
      if (cancelled || !result) return;
      setGeocodedCoords({ lat: result.lat, lng: result.lng });
    });
    return () => {
      cancelled = true;
    };
  }, [addressString, hasCoords, geocodedCoords, geocode]);

  const showMap = hasCoords || !!geocodedCoords;
  const lat = (hasCoords ? loc!.lat : geocodedCoords?.lat) as number | undefined;
  const lng = (hasCoords ? loc!.lng : geocodedCoords?.lng) as number | undefined;

  if (!loc && !addressString) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>
        <p className="text-gray-500 dark:text-gray-400">No location information available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>

      {showMap && lat != null && lng != null && (
        <div className="mb-4">
          <ListingMap lat={lat} lng={lng} title={listing.title} />
        </div>
      )}

      {!showMap && geocodeLoading && (
        <div className="mb-4 aspect-[16/9] rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading map…</p>
        </div>
      )}

      {loc && (loc.address || loc.city || loc.state || loc.country) && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatAddress(loc)}
          </p>
          <div className="mt-3">
            <GetDirectionsButtons
              destination={
                lat != null && lng != null
                  ? { lat, lng }
                  : { address: addressString }
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
