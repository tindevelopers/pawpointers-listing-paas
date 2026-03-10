"use client";

import { AddressSearch } from "@listing-platform/maps";
import type { GeocodingResult } from "@listing-platform/maps";

interface LocationFieldProps {
  formId: string;
  /** Display string shown in the search input (e.g. "123 Main St, City, Country"). */
  defaultValue?: string;
  /** Pre-fill the submitted address when editing a listing that already has address data. Ensures Publish validation sees the address. */
  initialAddressJson?: string;
}

/**
 * Address search field that populates a hidden form input with address JSON.
 * When user selects an address (or we have initialAddressJson), the hidden
 * input is set so the server receives street/city/region/country. The DB
 * trigger syncs listings.location from address when lat/lng present.
 */
export function LocationField({
  formId,
  defaultValue = "",
  initialAddressJson,
}: LocationFieldProps) {
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
    const input = form.querySelector('input[name="address"]') as HTMLInputElement;
    if (input) input.value = JSON.stringify(addr);
  };

  const handleClear = () => {
    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) return;
    const input = form.querySelector('input[name="address"]') as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Hidden input so the form always has an address value for Publish validation. Pre-filled when listing already has address. */}
      <input
        type="hidden"
        name="address"
        defaultValue={initialAddressJson ?? ""}
      />
      <label className="block text-sm font-medium text-gray-700">
        Business address (optional)
      </label>
      <AddressSearch
        onSelect={handleSelect}
        onClear={handleClear}
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
