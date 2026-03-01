"use client";

import { useState, useCallback } from "react";

export type Destination = { lat: number; lng: number } | { address: string };

function getGoogleMapsDirectionsUrl(
  destination: Destination,
  origin?: { lat: number; lng: number }
): string {
  const params = new URLSearchParams({ api: "1" });
  if ("lat" in destination) {
    params.set("destination", `${destination.lat},${destination.lng}`);
  } else {
    params.set("destination", destination.address);
  }
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getAppleMapsDirectionsUrl(
  destination: Destination,
  origin?: { lat: number; lng: number }
): string {
  const params = new URLSearchParams();
  if ("lat" in destination) {
    params.set("daddr", `${destination.lat},${destination.lng}`);
  } else {
    params.set("daddr", destination.address);
  }
  if (origin) {
    params.set("saddr", `${origin.lat},${origin.lng}`);
  }
  return `https://maps.apple.com/?${params.toString()}`;
}

function getPlatform(): "apple" | "android" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh|Mac Intel/.test(ua) && !/Mobile/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS || isMac) return "apple";
  if (isAndroid) return "android";
  return "desktop";
}

interface GetDirectionsButtonsProps {
  destination: Destination;
  addressLabel?: string;
  className?: string;
}

export function GetDirectionsButtons({
  destination,
  addressLabel,
  className = "",
}: GetDirectionsButtonsProps) {
  const platform = getPlatform();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Could not get your location. You can still open directions without a start point.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const googleUrl = getGoogleMapsDirectionsUrl(destination, userLocation ?? undefined);
  const appleUrl = getAppleMapsDirectionsUrl(destination, userLocation ?? undefined);

  const linkClass =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors";

  const primaryButton = (
    <>
      {platform === "apple" && (
        <a
          href={appleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
          Open in Apple Maps
        </a>
      )}
      {platform === "android" && (
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClass} bg-[#4285F4] text-white hover:bg-[#3367D6]`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            />
          </svg>
          Open in Google Maps
        </a>
      )}
      {platform === "desktop" && !showChooser && (
        <button
          type="button"
          onClick={() => setShowChooser(true)}
          className={`${linkClass} bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700`}
        >
          Get directions
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {primaryButton}
        {platform === "desktop" && showChooser && (
          <span className="flex flex-wrap items-center gap-2">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} bg-[#4285F4] text-white hover:bg-[#3367D6]`}
            >
              Google Maps
            </a>
            <a
              href={appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`}
            >
              Apple Maps
            </a>
            <button
              type="button"
              onClick={() => setShowChooser(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Close"
            >
              Cancel
            </button>
          </span>
        )}
        {(platform === "apple" || platform === "android") && (
          <a
            href={platform === "apple" ? googleUrl : appleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`}
          >
            {platform === "apple" ? "Google Maps" : "Apple Maps"}
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={requestLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {geoLoading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
              Getting location…
            </>
          ) : userLocation ? (
            <>
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              From my location (set)
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Use my location
            </>
          )}
        </button>
      </div>

      {geoError && (
        <p className="text-sm text-amber-600 dark:text-amber-400" role="alert">
          {geoError}
        </p>
      )}
      {addressLabel && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{addressLabel}</p>
      )}
    </div>
  );
}

export default GetDirectionsButtons;
