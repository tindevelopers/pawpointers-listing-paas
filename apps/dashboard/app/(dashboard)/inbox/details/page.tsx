import { redirect } from "next/navigation";
import { createClient } from "@/core/database/server";
import Link from "next/link";
import { getDashboardEntitlementsForUser } from "@/lib/listing-access";
import { canAccessDashboardFeature } from "@/lib/subscription-entitlements";
import EntitlementGate from "@/components/EntitlementGate";

export default async function InboxDetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const entitlements = await getDashboardEntitlementsForUser(user.id);
  const canAccessInbox = canAccessDashboardFeature(entitlements, "inbox");
  if (!canAccessInbox) {
    return (
      <EntitlementGate allowed={false} featureName="Inbox" requiredTier="middle" />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Conversation Details</h1>
        <p className="text-sm text-gray-600">
          View and manage individual conversation threads.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Conversation detail view coming soon.</p>
        <Link href="/inbox" className="mt-4 inline-block text-orange-600 hover:text-orange-700 hover:underline">
          Back to Inbox
        </Link>
      </div>
    </div>
  );
}
