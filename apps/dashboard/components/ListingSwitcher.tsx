"use client";

import { useListingScope } from "@/context/ListingScopeContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ListingSwitcher() {
  const { listings, currentListing, currentListingId, isLoading, switchListing } = useListingScope();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-100" />;
  }

  if (listings.length === 0) {
    return null;
  }

  async function handleSwitch(nextListingId: string | null) {
    setIsSwitching(true);
    try {
      await switchListing(nextListingId);
      router.refresh();
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-w-44 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <span className="truncate">
          {currentListing ? currentListing.title : "All businesses"}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            disabled={isSwitching}
            onClick={() => handleSwitch(null)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
              currentListingId === null ? "bg-orange-50 text-orange-700" : "text-gray-700"
            }`}
          >
            All businesses
          </button>
          {listings.map((listing) => (
            <button
              key={listing.id}
              disabled={isSwitching}
              onClick={() => handleSwitch(listing.id)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                currentListingId === listing.id ? "bg-orange-50 text-orange-700" : "text-gray-700"
              }`}
            >
              <div className="truncate font-medium">{listing.title}</div>
              <div className="text-xs uppercase tracking-wide text-gray-400">{listing.accessRole}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
