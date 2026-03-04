export type ListingTier = "base" | "middle" | "top";

export type DashboardLockedTabsMode = "showLockedTabs" | "hideUnavailableTabs";

export type DashboardFeatureKey =
  | "dashboard"
  | "merchantProfile"
  | "listings"
  | "media"
  | "billing"
  | "profile"
  | "bookings"
  | "reviews"
  | "inbox"
  | "team"
  | "topTierPromotions";

export type DashboardFeatureAccess = Record<DashboardFeatureKey, boolean>;

export type DashboardEntitlements = {
  tier: ListingTier;
  mode: DashboardLockedTabsMode;
  featureAccess: DashboardFeatureAccess;
};

export const DEFAULT_DASHBOARD_LOCKED_TABS_MODE: DashboardLockedTabsMode =
  "showLockedTabs";

export function mapAccountPlanToTier(plan?: string | null): ListingTier {
  const normalized = String(plan || "starter").toLowerCase();
  if (normalized === "professional" || normalized === "pro") return "middle";
  if (normalized === "enterprise" || normalized === "custom") return "top";
  return "base";
}

export function buildDashboardFeatureAccess(tier: ListingTier): DashboardFeatureAccess {
  const isMiddleOrAbove = tier === "middle" || tier === "top";
  const isTop = tier === "top";

  return {
    dashboard: true,
    merchantProfile: true,
    listings: true,
    media: true,
    billing: true,
    profile: true,
    bookings: isMiddleOrAbove,
    reviews: isMiddleOrAbove,
    inbox: isMiddleOrAbove,
    team: isTop,
    topTierPromotions: isTop,
  };
}

export function resolveDashboardEntitlements(input: {
  tier?: ListingTier | null;
  accountPlan?: string | null;
  mode?: DashboardLockedTabsMode;
}): DashboardEntitlements {
  const tier = input.tier || mapAccountPlanToTier(input.accountPlan);
  const envMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_DASHBOARD_TABS_MODE === "hideUnavailableTabs"
      ? "hideUnavailableTabs"
      : DEFAULT_DASHBOARD_LOCKED_TABS_MODE;
  return {
    tier,
    mode: input.mode || envMode,
    featureAccess: buildDashboardFeatureAccess(tier),
  };
}

export function canAccessDashboardFeature(
  entitlements: DashboardEntitlements,
  feature: DashboardFeatureKey
): boolean {
  return entitlements.featureAccess[feature];
}
