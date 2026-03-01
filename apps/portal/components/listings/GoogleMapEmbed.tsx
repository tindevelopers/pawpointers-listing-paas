"use client";

/**
 * GoogleMapEmbed - Embeds Google Maps via the Maps Embed API (iframe).
 * Requires Maps Embed API to be enabled in Google Cloud and
 * NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY to be set.
 * @see https://developers.google.com/maps/documentation/embed/get-started
 */

interface GoogleMapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
  className?: string;
}

export function GoogleMapEmbed({
  lat,
  lng,
  zoom = 14,
  title,
  className = "",
}: GoogleMapEmbedProps) {
  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
      : undefined;

  if (!apiKey) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ${className}`}
        style={{ minHeight: 200 }}
      >
        <p className="text-sm font-medium">{title || "Location"}</p>
        <p className="text-xs mt-1">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
        <p className="text-xs mt-2 text-center px-4">
          Set NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY and enable Maps Embed API to
          show the map
        </p>
      </div>
    );
  }

  // Maps Embed API: q can be address, place name, or "lat,lng"
  const q = `${lat},${lng}`;
  const params = new URLSearchParams({
    key: apiKey,
    q,
    zoom: String(zoom),
  });
  const embedUrl = `https://www.google.com/maps/embed/v1/place?${params.toString()}`;

  return (
    <iframe
      title={title || "Map"}
      src={embedUrl}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`rounded-xl ${className}`}
    />
  );
}

export default GoogleMapEmbed;
