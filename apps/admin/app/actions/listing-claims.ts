"use server";

import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { isPlatformAdmin } from "./organization-admins";

type ListingClaimDecision = "approve" | "reject";

export type ListingClaimRecord = {
  id: string;
  listing_id: string;
  claimant_user_id: string;
  reviewer_user_id: string | null;
  status: string;
  verification: Record<string, unknown> | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  listing: {
    id: string;
    title: string;
    slug: string;
  } | null;
  claimant: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  reviewer: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

async function requirePlatformAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const platformAdmin = await isPlatformAdmin();
  if (!platformAdmin) {
    throw new Error("Platform Admin access required");
  }

  return user;
}

export async function getListingClaims(status?: string): Promise<ListingClaimRecord[]> {
  await requirePlatformAdminUser();
  const adminClient = createAdminClient();

  let query = (adminClient.from("listing_claims" as any) as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: claims, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const claimRows = (claims || []) as Array<{
    id: string;
    listing_id: string;
    claimant_user_id: string;
    reviewer_user_id: string | null;
    status: string;
    verification: Record<string, unknown> | null;
    review_notes: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const listingIds = [...new Set(claimRows.map((claim) => claim.listing_id))];
  const userIds = [
    ...new Set(
      claimRows
        .flatMap((claim) => [claim.claimant_user_id, claim.reviewer_user_id])
        .filter((id): id is string => !!id)
    ),
  ];

  const [{ data: listings }, { data: users }] = await Promise.all([
    listingIds.length > 0
      ? adminClient.from("listings").select("id, title, slug").in("id", listingIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? adminClient.from("users").select("id, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const listingById = new Map(
    (listings || []).map((row: { id: string; title: string; slug: string }) => [row.id, row])
  );
  const userById = new Map(
    (users || []).map((row: { id: string; email: string; full_name: string | null }) => [row.id, row])
  );

  return claimRows.map((claim) => ({
    ...claim,
    listing: listingById.get(claim.listing_id) || null,
    claimant: userById.get(claim.claimant_user_id) || null,
    reviewer: claim.reviewer_user_id ? userById.get(claim.reviewer_user_id) || null : null,
  }));
}

export async function reviewListingClaim(
  claimId: string,
  decision: ListingClaimDecision,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requirePlatformAdminUser();
    const adminClient = createAdminClient();

    const { data: claim } = await (adminClient.from("listing_claims" as any) as any)
      .select("id, listing_id, claimant_user_id, status")
      .eq("id", claimId)
      .single();

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    const nowIso = new Date().toISOString();

    if (decision === "approve") {
      const { data: listing } = await adminClient
        .from("listings")
        .select("id, owner_id")
        .eq("id", claim.listing_id)
        .single();

      if (!listing) {
        return { success: false, error: "Listing not found" };
      }

      const previousOwnerId = (listing as { owner_id?: string | null }).owner_id || null;

      const { error: updateListingError } = await adminClient
        .from("listings")
        .update({ owner_id: claim.claimant_user_id })
        .eq("id", claim.listing_id);

      if (updateListingError) {
        return { success: false, error: updateListingError.message };
      }

      const { error: claimantMembershipError } = await (adminClient
        .from("listing_members" as any) as any)
        .upsert(
          {
            listing_id: claim.listing_id,
            user_id: claim.claimant_user_id,
            role: "owner",
            permissions: ["listings.*", "bookings.*", "reviews.*"],
            status: "active",
          },
          { onConflict: "listing_id,user_id" }
        );

      if (claimantMembershipError) {
        return { success: false, error: claimantMembershipError.message };
      }

      if (previousOwnerId && previousOwnerId !== claim.claimant_user_id) {
        await (adminClient.from("listing_members" as any) as any).upsert(
          {
            listing_id: claim.listing_id,
            user_id: previousOwnerId,
            role: "admin",
            permissions: ["listings.write", "bookings.write", "reviews.write"],
            status: "active",
          },
          { onConflict: "listing_id,user_id" }
        );
      }

      const { error: claimUpdateError } = await (adminClient.from("listing_claims" as any) as any)
        .update({
          status: "approved",
          reviewer_user_id: currentUser.id,
          reviewed_at: nowIso,
          approved_at: nowIso,
          review_notes: reviewNotes || null,
          rejection_reason: null,
        })
        .eq("id", claimId);

      if (claimUpdateError) {
        return { success: false, error: claimUpdateError.message };
      }
    } else {
      const { error: claimUpdateError } = await (adminClient.from("listing_claims" as any) as any)
        .update({
          status: "rejected",
          reviewer_user_id: currentUser.id,
          reviewed_at: nowIso,
          review_notes: reviewNotes || null,
          rejection_reason: reviewNotes || "Rejected by reviewer",
        })
        .eq("id", claimId);

      if (claimUpdateError) {
        return { success: false, error: claimUpdateError.message };
      }

      await (adminClient.from("listing_members" as any) as any)
        .delete()
        .eq("listing_id", claim.listing_id)
        .eq("user_id", claim.claimant_user_id)
        .eq("role", "admin");
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review claim",
    };
  }
}
