import { createClient } from "@/core/database/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type DashboardStats = {
  listingCount: number;
  reviewCount: number;
  conversationCount: number;
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
      stats: { listingCount: 0, reviewCount: 0, conversationCount: 0 },
    };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: listingRows } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = (listingRows || []).map((row: any) => row.id);

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

  return {
    user,
    tenantId: (userRow as any)?.tenant_id ?? null,
    stats: {
      listingCount: listingIds.length,
      reviewCount,
      conversationCount: conversationCount ?? 0,
    } satisfies DashboardStats,
  };
}

export default async function DashboardPage() {
  const { user, tenantId, stats } = await getDashboardContext();

  if (!user) {
    redirect("/signin");
  }

  const cards = [
    { label: "Listings", value: stats.listingCount, href: "/listings" },
    { label: "Reviews", value: stats.reviewCount, href: "/reviews" },
    { label: "Inbox", value: stats.conversationCount, href: "/inbox" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Tenant</p>
        <h1 className="text-3xl font-semibold text-gray-900">Merchant Dashboard</h1>
        <p className="text-sm text-gray-600">
          Tenant ID: {tenantId ?? "Not linked"} — manage your listings, respond to reviews, and stay on top of customer
          messages.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quick start</h2>
            <p className="mt-1 text-sm text-gray-600">
              Create a listing, add photos, and reply to customer feedback from one place.
            </p>
          </div>
          <Link href="/listings" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Add listing
          </Link>
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-700">
          <li>
            Publish your <Link href="/listings" className="text-indigo-600 underline">listings</Link>.
          </li>
          <li>
            Add photos in <Link href="/listings" className="text-indigo-600 underline">media</Link> once your draft is
            saved.
          </li>
          <li>
            Respond to <Link href="/reviews" className="text-indigo-600 underline">reviews</Link> to build trust.
          </li>
          <li>
            Keep up with leads in the <Link href="/inbox" className="text-indigo-600 underline">inbox</Link>.
          </li>
        </ol>
      </div>
    </div>
  );
}

