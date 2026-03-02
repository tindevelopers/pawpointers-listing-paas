import "server-only";

import { createClient } from "@/core/database/server";
import { cookies } from "next/headers";

type MembershipRow = {
  listing_id: string;
  role: "owner" | "admin" | "editor" | "support";
  permissions: string[] | null;
  status: "active" | "inactive";
};

function hasAnyPermission(permissions: string[] | null, allowed: string[]) {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((permission) => allowed.includes(permission));
}

export async function getListingMemberships(userId: string): Promise<MembershipRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_members")
    .select("listing_id, role, permissions, status")
    .eq("user_id", userId)
    .eq("status", "active");

  return ((data || []) as MembershipRow[]);
}

export async function getAccessibleListingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: ownedListings }, memberships] = await Promise.all([
    supabase.from("listings").select("id").eq("owner_id", userId),
    getListingMemberships(userId),
  ]);

  const ids = new Set<string>();
  (ownedListings || []).forEach((row: { id: string }) => ids.add(row.id));
  memberships.forEach((row) => ids.add(row.listing_id));

  return [...ids];
}

export async function getScopedListingIds(userId: string): Promise<string[]> {
  const accessibleListingIds = await getAccessibleListingIds(userId);
  if (accessibleListingIds.length === 0) return [];

  const currentListingId = (await cookies()).get("current_listing_id")?.value;
  if (currentListingId && accessibleListingIds.includes(currentListingId)) {
    return [currentListingId];
  }

  return accessibleListingIds;
}

export async function getManageableListingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: ownedListings }, memberships] = await Promise.all([
    supabase.from("listings").select("id").eq("owner_id", userId),
    getListingMemberships(userId),
  ]);

  const ids = new Set<string>();
  (ownedListings || []).forEach((row: { id: string }) => ids.add(row.id));

  memberships.forEach((row) => {
    if (
      ["owner", "admin", "editor"].includes(row.role) ||
      hasAnyPermission(row.permissions, ["listings.write", "listings.*"])
    ) {
      ids.add(row.listing_id);
    }
  });

  return [...ids];
}

export async function canManageListing(userId: string, listingId: string): Promise<boolean> {
  const manageableIds = await getManageableListingIds(userId);
  return manageableIds.includes(listingId);
}

export async function getBookingManageableListingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: ownedListings }, memberships] = await Promise.all([
    supabase.from("listings").select("id").eq("owner_id", userId),
    getListingMemberships(userId),
  ]);

  const ids = new Set<string>();
  (ownedListings || []).forEach((row: { id: string }) => ids.add(row.id));

  memberships.forEach((row) => {
    if (
      ["owner", "admin", "support"].includes(row.role) ||
      hasAnyPermission(row.permissions, ["bookings.read", "bookings.write", "bookings.*"])
    ) {
      ids.add(row.listing_id);
    }
  });

  return [...ids];
}

export async function canManageBookingForListing(
  userId: string,
  listingId: string
): Promise<boolean> {
  const listingIds = await getBookingManageableListingIds(userId);
  return listingIds.includes(listingId);
}
