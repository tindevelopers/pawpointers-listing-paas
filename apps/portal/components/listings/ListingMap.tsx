"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { Map, Marker } from "@listing-platform/maps";

/**
 * ListingMap - Map component for listing location
 * Uses @listing-platform/maps (Mapbox) for interactive map display.
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN to be set.
 */

interface ListingMapProps {
  lat: number;
  lng: number;
  title: string;
}

export function ListingMap({ lat, lng, title }: ListingMapProps) {
  const hasToken = typeof process !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!hasToken) {
    return (
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs mt-1">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
        <p className="text-xs mt-2 text-gray-400">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to show the map
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
      <Map
        center={{ lat, lng }}
        zoom={14}
        provider="mapbox"
        apiKey={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        className="w-full h-full rounded-xl"
        interactive={true}
        showControls={true}
      >
        <Marker position={{ lat, lng }} title={title} />
      </Map>
    </div>
  );
}

export default ListingMap;
