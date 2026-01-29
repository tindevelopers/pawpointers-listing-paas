"use server";

import { createAdminClient } from "@/core/database/admin-client";

export type DashboardActivitySource = "activity" | "booking" | "listing" | "review";

export interface DashboardActivity {
  id: string;
  source: DashboardActivitySource;
  title: string;
  description: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface DashboardQueries {
  tenantId: string;
  limit?: number;
}

export async function getRecentActivities({
  tenantId,
  limit = 6,
}: DashboardQueries): Promise<DashboardActivity[]> {
  if (!tenantId) {
    return [];
  }

  const adminClient = createAdminClient();
  const queryLimit = limit * 2;

  const [activityResult, bookingResult, listingResult, reviewResult] = await Promise.all([
    (adminClient.from("activities") as any)
      .select("id, type, description, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(queryLimit),
    (adminClient.from("bookings") as any)
      .select(
        "id, listing_id, user_id, status, confirmation_code, created_at, start_date, end_date"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(queryLimit),
    (adminClient.from("listings") as any)
      .select("id, title, status, created_at, published_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(queryLimit),
    (adminClient.from("reviews") as any)
      .select(
        "id, listing_id, rating, title, content, verified_purchase, verified_visit, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(queryLimit),
  ]);

  const safeDate = (value: unknown) =>
    value ? new Date(value as string).toISOString() : new Date().toISOString();

  const feed: DashboardActivity[] = [
    ...(activityResult.data?.map((record: any) => ({
      id: `activity-${record.id}`,
      source: "activity",
      title: record.type || "Activity",
      description: record.description || "",
      createdAt: safeDate(record.created_at),
      metadata: record.metadata || {},
    })) || []),
    ...(bookingResult.data?.map((record: any) => ({
      id: `booking-${record.id}`,
      source: "booking",
      title: record.confirmation_code
        ? `Booking ${record.confirmation_code}`
        : `Booking ${record.id}`,
      description: `Status: ${record.status || "pending"} • ${record.start_date || "N/A"}`,
      createdAt: safeDate(record.created_at),
      metadata: {
        listingId: record.listing_id,
        userId: record.user_id,
        startDate: record.start_date,
        endDate: record.end_date,
      },
    })) || []),
    ...(listingResult.data?.map((record: any) => ({
      id: `listing-${record.id}`,
      source: "listing",
      title: record.title || "Listing",
      description: `Status: ${record.status || "draft"}`,
      createdAt: safeDate(record.created_at),
      metadata: {
        publishedAt: record.published_at,
      },
    })) || []),
    ...(reviewResult.data?.map((record: any) => ({
      id: `review-${record.id}`,
      source: "review",
      title: record.title || `Review ${record.id}`,
      description: record.content
        ? record.content
        : `Rating: ${record.rating}/5${record.verified_purchase ? " • Verified" : ""}`,
      createdAt: safeDate(record.created_at),
      metadata: {
        listingId: record.listing_id,
        rating: record.rating,
        verifiedPurchase: record.verified_purchase,
        verifiedVisit: record.verified_visit,
      },
    })) || []),
  ];

  return feed
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
