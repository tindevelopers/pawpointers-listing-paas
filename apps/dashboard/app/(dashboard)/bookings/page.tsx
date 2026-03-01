import { createClient } from "@/core/database/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: listingRows } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_id", user.id);

  const listingIds = (listingRows || []).map((row: { id: string }) => row.id);

  let bookings: Array<{
    id: string;
    listing_id: string;
    status: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    total_amount: number;
    currency: string;
    confirmation_code?: string;
    created_at: string;
    listings?: { id: string; title: string; slug: string } | null;
  }> = [];

  if (listingIds.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, listing_id, status, start_date, end_date, start_time, end_time, total_amount, currency, confirmation_code, created_at, listings(id, title, slug)")
      .in("listing_id", listingIds)
      .order("start_date", { ascending: true });

    bookings = (data || []) as typeof bookings;
  }

  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.start_date) >= new Date()
  );
  const past = bookings.filter(
    (b) => b.status === "cancelled" || new Date(b.start_date) < new Date()
  );

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(t?: string) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h12}:${(m || 0).toString().padStart(2, "0")} ${suffix}`;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-600">
          View and manage appointments for your listings.
        </p>
      </header>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          <p>No bookings yet.</p>
          <p className="mt-2 text-sm">
            When customers book via the portal (or Cal.com), they will appear here.
          </p>
          <Link href="/listings" className="mt-4 inline-block text-orange-600 hover:underline">
            Manage listings →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming</h2>
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {(b.listings as { title?: string })?.title ?? "Listing"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(b.start_date)}
                        {b.start_time && ` · ${formatTime(b.start_time)}`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {b.confirmation_code && `Ref: ${b.confirmation_code}`}
                        {" · "}
                        <span className="capitalize">{b.status}</span>
                      </p>
                    </div>
                    <p className="text-right font-medium text-gray-900">
                      {b.currency} {Number(b.total_amount).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Past / Cancelled</h2>
              <ul className="space-y-3">
                {past.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-700">
                        {(b.listings as { title?: string })?.title ?? "Listing"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(b.start_date)}
                        {b.start_time && ` · ${formatTime(b.start_time)}`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 capitalize">{b.status}</p>
                    </div>
                    <p className="text-right text-gray-700">
                      {b.currency} {Number(b.total_amount).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
