import Link from "next/link";
import type { ListingTier } from "@/lib/subscription-entitlements";

interface EntitlementGateProps {
  allowed: boolean;
  featureName: string;
  requiredTier: ListingTier;
  children?: React.ReactNode;
}

export function EntitlementGate({
  allowed,
  featureName,
  requiredTier,
  children,
}: EntitlementGateProps) {
  if (allowed) return <>{children}</>;

  const requiredPlanLabel =
    requiredTier === "top"
      ? "Premium Paw"
      : requiredTier === "middle"
        ? "Pro Paw"
        : "Starter Paw";

  const includesLabel =
    requiredTier === "top"
      ? "Premium Paw"
      : "Pro Paw and Premium Paw";

  const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN;
  const pricingHref = portalDomain
    ? portalDomain.startsWith("http://") || portalDomain.startsWith("https://")
      ? `${portalDomain}/pricing`
      : portalDomain.startsWith("localhost") || portalDomain.startsWith("127.0.0.1")
        ? `http://${portalDomain}/pricing`
        : `https://${portalDomain}/pricing`
    : "/billing/upgrade";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">{featureName}</h1>
        <p className="text-sm text-gray-600">
          This section is included in {includesLabel}.
        </p>
      </header>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-8">
        <h2 className="text-xl font-semibold text-orange-900">
          {featureName} is part of {requiredPlanLabel}
        </h2>
        <p className="mt-2 text-sm text-orange-800">
          Pick the plan that fits your growth stage and unlock this feature with the same package messaging used on Pricing.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={pricingHref}
            className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {requiredTier === "top" ? "Upgrade to Premium" : "Start Pro Plan"}
          </Link>
          <Link
            href="/billing"
            className="inline-flex items-center rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100"
          >
            View billing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EntitlementGate;
