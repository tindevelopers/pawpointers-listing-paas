import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { getDashboardEntitlementsForUser, getScopedListingIds } from "@/lib/listing-access";
import { canAccessDashboardFeature, type DashboardFeatureKey } from "@/lib/subscription-entitlements";
import { DashboardView } from "./DashboardView";

type DashboardStats = {
  listingCount: number;
  reviewCount: number;
  conversationCount: number;
  bookingCount: number;
};

async function getDashboardContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      tenantId: null,
      stats: { listingCount: 0, reviewCount: 0, conversationCount: 0, bookingCount: 0 },
    };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const listingIds = await getScopedListingIds(user.id);

  let reviewCount = 0;
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("listing_id", listingIds);
    reviewCount = count ?? 0;
  }

  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`);

  let bookingCount = 0;
  if (listingIds.length > 0) {
    try {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("listing_id", listingIds);
      bookingCount = count ?? 0;
    } catch {
      bookingCount = 0;
    }
  }

  return {
    user,
    tenantId: (userRow as any)?.tenant_id ?? null,
    stats: {
      listingCount: listingIds.length,
      reviewCount,
      conversationCount: conversationCount ?? 0,
      bookingCount,
    } satisfies DashboardStats,
  };
}

export default async function DashboardPage() {
  const { user, tenantId, stats } = await getDashboardContext();

  if (!user) {
    redirect("/signin");
  }

  const entitlements = await getDashboardEntitlementsForUser(user.id);

  const cardConfig = [
    { label: "Listings", value: stats.listingCount, href: "/listings", feature: "listings" as DashboardFeatureKey },
    { label: "Bookings", value: stats.bookingCount, href: "/bookings", feature: "bookings" as DashboardFeatureKey },
    { label: "Reviews", value: stats.reviewCount, href: "/reviews", feature: "reviews" as DashboardFeatureKey },
    { label: "Inbox", value: stats.conversationCount, href: "/inbox", feature: "inbox" as DashboardFeatureKey },
  ];

  const cards = cardConfig.map((card) => {
    const allowed = canAccessDashboardFeature(entitlements, card.feature);
    const href = allowed ? card.href : `/billing/upgrade?feature=${encodeURIComponent(card.feature)}`;
    return { label: card.label, value: card.value, href };
  });

  return (
    <DashboardView
      tenantId={tenantId != null ? String(tenantId) : null}
      cards={cards}
    />
  );
}
