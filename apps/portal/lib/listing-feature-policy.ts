import type {
  ListingCardSizeVariant,
  ListingFeatureAccess,
  ListingTier,
  TopTierFeatureFlags,
} from "@listing-platform/config";

export type ListingPolicyInput = {
  isUnclaimed?: boolean;
  effectiveTier?: ListingTier | string | null;
  cardSizeVariant?: ListingCardSizeVariant | string | null;
  accountPlan?: string | null;
  subscriptionTierOverride?: ListingTier | string | null;
  topTierFeatures?: TopTierFeatureFlags | Record<string, unknown> | null;
};

export const DEFAULT_TOP_TIER_FEATURES: TopTierFeatureFlags = {
  highlightInSearch: true,
  homepageSpotlight: false,
  premiumBadge: true,
  advancedAnalytics: false,
  prioritySupport: false,
  customBranding: false,
  promotionalSlots: false,
};

function toTier(value: unknown): ListingTier | null {
  if (value === "base" || value === "middle" || value === "top") return value;
  return null;
}

export function mapPlanToTier(plan?: string | null): ListingTier {
  const normalized = String(plan || "starter").toLowerCase();
  if (normalized === "professional" || normalized === "pro") return "middle";
  if (normalized === "enterprise" || normalized === "custom") return "top";
  return "base";
}

export function resolveEffectiveTier(input: ListingPolicyInput): ListingTier {
  const override = toTier(input.subscriptionTierOverride);
  if (override) return override;

  const tier = toTier(input.effectiveTier);
  if (tier) return tier;

  return mapPlanToTier(input.accountPlan);
}

export function resolveCardSizeVariant(
  input: ListingPolicyInput,
  effectiveTier: ListingTier
): ListingCardSizeVariant {
  if (input.isUnclaimed) return "compact";

  if (
    input.cardSizeVariant === "compact" ||
    input.cardSizeVariant === "standard" ||
    input.cardSizeVariant === "featured"
  ) {
    return input.cardSizeVariant;
  }

  if (effectiveTier === "top") return "featured";
  if (effectiveTier === "middle") return "standard";
  return "compact";
}

export function buildFeatureAccess(input: ListingPolicyInput): ListingFeatureAccess {
  if (input.isUnclaimed) {
    return {
      canShowPrimaryImage: true,
      canShowGallery: false,
      canShowShortDescription: true,
      canShowFullDescription: false,
      canShowAddress: true,
      canShowMap: false,
      canShowPhone: false,
      canShowEmail: false,
      canShowWebsite: false,
      canShowPricing: false,
      canShowAvailability: false,
      canBook: false,
      canMessageOwner: false,
      canShowReviews: false,
      canRespondToReviews: false,
      canClaim: true,
    };
  }

  const tier = resolveEffectiveTier(input);
  const isMiddleOrAbove = tier === "middle" || tier === "top";

  return {
    canShowPrimaryImage: true,
    canShowGallery: true,
    canShowShortDescription: true,
    canShowFullDescription: true,
    canShowAddress: true,
    canShowMap: true,
    canShowPhone: true,
    canShowEmail: true,
    canShowWebsite: true,
    canShowPricing: true,
    canShowAvailability: true,
    canBook: isMiddleOrAbove,
    canMessageOwner: isMiddleOrAbove,
    canShowReviews: true,
    canRespondToReviews: isMiddleOrAbove,
    canClaim: false,
  };
}

export function resolveTopTierFeatures(
  input: ListingPolicyInput,
  effectiveTier: ListingTier
): TopTierFeatureFlags {
  if (effectiveTier !== "top") {
    return { ...DEFAULT_TOP_TIER_FEATURES, highlightInSearch: false, premiumBadge: false };
  }

  return {
    ...DEFAULT_TOP_TIER_FEATURES,
    ...(input.topTierFeatures || {}),
  };
}
