import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { createListing } from "@/app/actions/listings";

export default async function ListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, slug, status, created_at, rating_average, rating_count")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const listingsArray = listings || [];

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Listings</h1>
        <p className="text-sm text-gray-600">
          Manage your listings. Drafts stay hidden until you publish them from the platform admin.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Create a listing</h2>
        <form action={createListing} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" required placeholder="e.g. Happy Paws Grooming" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Short description of your service."
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
            >
              Save draft
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your listings</h2>
        {listingsArray.length === 0 ? (
          <p className="text-sm text-gray-600">No listings yet. Create your first listing above.</p>
        ) : (
          <div className="grid gap-4">
            {(listingsArray as any[]).map((listing: any) => (
              <div
                key={listing.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                    <p className="text-xs text-gray-500">Slug: {listing.slug}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ratings: {listing.rating_average ?? "–"} ({listing.rating_count ?? 0})
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {listing.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

