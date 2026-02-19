"use client";

import { AddressSearch } from "@listing-platform/maps";
import type { GeocodingResult } from "@listing-platform/maps";

interface LocationFieldProps {
  formId: string;
  defaultValue?: string;
}

/**
 * Address search field that populates hidden form inputs for address data.
 * When user selects an address, lat/lng/street/city/region/country are saved
 * to hidden inputs; the server action reads them and saves to listings.address.
 * The DB trigger syncs listings.location from address when lat/lng present.
 */
export function LocationField({ formId, defaultValue = "" }: LocationFieldProps) {
  const handleSelect = (result: GeocodingResult) => {
    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) return;
    const addr = {
      lat: result.lat,
      lng: result.lng,
      street: result.street || result.formatted?.split(",")[0] || "",
      city: result.city || "",
      region: result.region || "",
      country: result.country || "",
    };
    let input = form.querySelector('input[name="address"]') as HTMLInputElement;
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = "address";
      form.appendChild(input);
    }
    input.value = JSON.stringify(addr);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Business address (optional)
      </label>
      <AddressSearch
        onSelect={handleSelect}
        placeholder="Search for your business address..."
        defaultValue={defaultValue}
        showCurrentLocation={true}
        apiKey={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        className="w-full"
      />
      <p className="text-xs text-gray-500">
        Add your address so customers can find you and get directions.
      </p>
    </div>
  );
}
