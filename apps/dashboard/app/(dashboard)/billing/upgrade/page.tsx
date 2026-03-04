import { redirect } from "next/navigation";
import { createClient } from "@/core/database/server";
import Link from "next/link";

type UpgradeSearchParams = Record<string, string | string[] | undefined>;

const featureCopy: Record<
  string,
  { title: string; details: string; requiredTier: "middle" | "top" }
> = {
  bookings: {
    title: "Bookings are included in Pro Paw",
    details: "Accept online bookings, manage appointments, and keep your schedule full from one dashboard.",
    requiredTier: "middle",
  },
  reviews: {
    title: "Review tools are included in Pro Paw",
    details: "Respond to ratings and reviews to build trust and improve conversion from listing views.",
    requiredTier: "middle",
  },
  inbox: {
    title: "Inbox messaging is included in Pro Paw",
    details: "Keep customer conversations in one place and reply directly from your merchant dashboard.",
    requiredTier: "middle",
  },
  team: {
    title: "Team tools are included in Premium Paw",
    details: "Invite staff, delegate roles, and manage advanced access controls for multi-user operations.",
    requiredTier: "top",
  },
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: UpgradeSearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const feature = typeof searchParams?.feature === "string" ? searchParams.feature : "";
  const copy = featureCopy[feature] || {
    title: "Choose the right Paw plan",
    details: "Move from Starter Paw to Pro Paw or Premium Paw as your business grows.",
    requiredTier: "middle" as const,
  };

  const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN;
  const pricingHref = portalDomain
    ? portalDomain.startsWith("http://") || portalDomain.startsWith("https://")
      ? `${portalDomain}/pricing`
      : portalDomain.startsWith("localhost") || portalDomain.startsWith("127.0.0.1")
        ? `http://${portalDomain}/pricing`
        : `https://${portalDomain}/pricing`
    : "/billing";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Plans & Upgrades</h1>
        <p className="text-sm text-gray-600">
          {copy.details}
        </p>
      </header>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-8">
        <h2 className="text-xl font-semibold text-orange-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-orange-800">
          Choose a higher package to activate this capability for your listings.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-orange-900">
          <li>Starter Paw: profile, media, and listing management.</li>
          <li>Pro Paw: adds bookings, inbox messaging, and review tools.</li>
          <li>Premium Paw: includes Pro Paw plus premium visibility and advanced growth tools.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={pricingHref} className="inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            {copy.requiredTier === "top" ? "Upgrade to Premium" : "Start Pro Plan"}
          </Link>
          <Link href="/billing" className="inline-flex rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100">
            Back to Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
