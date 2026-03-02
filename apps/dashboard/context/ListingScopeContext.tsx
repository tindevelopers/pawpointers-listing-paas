"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/core/database/client";

type ListingRole = "owner" | "admin" | "editor" | "support";

type AccessibleListing = {
  id: string;
  title: string;
  slug: string;
  accessRole: ListingRole;
};

type ListingScopeContextType = {
  listings: AccessibleListing[];
  currentListingId: string | null;
  currentListing: AccessibleListing | null;
  isLoading: boolean;
  switchListing: (listingId: string | null) => Promise<void>;
};

const CURRENT_LISTING_STORAGE_KEY = "current_listing_id";

const ListingScopeContext = createContext<ListingScopeContextType | undefined>(undefined);

function rolePriority(role: ListingRole): number {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "editor":
      return 2;
    default:
      return 1;
  }
}

async function syncCurrentListingCookie(listingId: string | null) {
  await fetch("/api/current-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  });
}

export function ListingScopeProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<AccessibleListing[]>([]);
  const [currentListingId, setCurrentListingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadScope() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setListings([]);
            setCurrentListingId(null);
          }
          return;
        }

        const { data: ownedRows } = await supabase
          .from("listings")
          .select("id, title, slug")
          .eq("owner_id", user.id);

        let membershipRows: Array<{
          listing_id: string;
          role: ListingRole;
          status: "active" | "inactive";
        }> = [];
        const membershipResult = await supabase
          .from("listing_members")
          .select("listing_id, role, status")
          .eq("user_id", user.id)
          .eq("status", "active");
        if (!membershipResult.error) {
          membershipRows = (membershipResult.data || []) as Array<{
            listing_id: string;
            role: ListingRole;
            status: "active" | "inactive";
          }>;
        }

        const roleByListingId = new Map<string, ListingRole>();
        (ownedRows || []).forEach((row: { id: string }) => {
          roleByListingId.set(row.id, "owner");
        });

        const memberListingIds = new Set<string>();
        membershipRows.forEach((row) => {
          memberListingIds.add(row.listing_id);
          const existing = roleByListingId.get(row.listing_id);
          if (!existing || rolePriority(row.role) > rolePriority(existing)) {
            roleByListingId.set(row.listing_id, row.role);
          }
        });

        const memberListingIdsWithoutOwned = [...memberListingIds].filter(
          (id) => !(ownedRows || []).some((row: { id: string }) => row.id === id)
        );

        const { data: memberListings } =
          memberListingIdsWithoutOwned.length === 0
            ? { data: [] }
            : await supabase
                .from("listings")
                .select("id, title, slug")
                .in("id", memberListingIdsWithoutOwned);

        const merged = new Map<string, AccessibleListing>();
        (ownedRows || []).forEach((row: { id: string; title: string; slug: string }) => {
          merged.set(row.id, {
            id: row.id,
            title: row.title,
            slug: row.slug,
            accessRole: roleByListingId.get(row.id) || "owner",
          });
        });
        (memberListings || []).forEach((row: { id: string; title: string; slug: string }) => {
          merged.set(row.id, {
            id: row.id,
            title: row.title,
            slug: row.slug,
            accessRole: roleByListingId.get(row.id) || "support",
          });
        });

        const nextListings = [...merged.values()].sort((a, b) => a.title.localeCompare(b.title));
        const storedListingId =
          typeof window !== "undefined"
            ? localStorage.getItem(CURRENT_LISTING_STORAGE_KEY)
            : null;
        const scopedListingId =
          storedListingId && nextListings.some((listing) => listing.id === storedListingId)
            ? storedListingId
            : null;

        if (!cancelled) {
          setListings(nextListings);
          setCurrentListingId(scopedListingId);
        }

        if (typeof window !== "undefined") {
          if (scopedListingId) {
            localStorage.setItem(CURRENT_LISTING_STORAGE_KEY, scopedListingId);
          } else {
            localStorage.removeItem(CURRENT_LISTING_STORAGE_KEY);
          }
        }

        await syncCurrentListingCookie(scopedListingId);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadScope();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentListing = useMemo(
    () => listings.find((listing) => listing.id === currentListingId) ?? null,
    [listings, currentListingId]
  );

  async function switchListing(listingId: string | null) {
    const validatedListingId =
      listingId && listings.some((listing) => listing.id === listingId) ? listingId : null;

    setCurrentListingId(validatedListingId);
    if (validatedListingId) {
      localStorage.setItem(CURRENT_LISTING_STORAGE_KEY, validatedListingId);
    } else {
      localStorage.removeItem(CURRENT_LISTING_STORAGE_KEY);
    }
    await syncCurrentListingCookie(validatedListingId);
  }

  return (
    <ListingScopeContext.Provider
      value={{
        listings,
        currentListingId,
        currentListing,
        isLoading,
        switchListing,
      }}
    >
      {children}
    </ListingScopeContext.Provider>
  );
}

export function useListingScope() {
  const context = useContext(ListingScopeContext);
  if (!context) {
    throw new Error("useListingScope must be used within ListingScopeProvider");
  }
  return context;
}
