import { createClient } from "@/core/database/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createListing, publishListing, unpublishListing, deleteListing } from "@/app/actions/listings";
import { LocationField } from "./LocationField";
import { ImageDropzone } from "./ImageDropzone";
import { DeleteListingButton } from "./DeleteListingButton";
import { getScopedListingIds } from "@/lib/listing-access";

const inputBase =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

export default async function ListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const listingIds = await getScopedListingIds(user.id);

  const { data: listings } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("listings")
          .select("id, title, slug, status, created_at, rating_average, rating_count")
          .in("id", listingIds)
          .order("created_at", { ascending: false });

  const listingsArray = listings || [];

  return (
    <div className="bg-[#f8fafc]">
      <div className="space-y-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-600">
            Manage your listings. Publish a draft to make it visible on the public portal.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create a listing</h2>
          <form
            id="create-listing-form"
            action={createListing}
            className="mt-8"
          >
            <div className="grid gap-8 md:grid-cols-2">
              {/* Left column: Service Details + Location */}
              <div className="space-y-8">
                {/* Service Details */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Service Details
                  </h3>
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/30 p-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700" htmlFor="title">
                        Title
                      </label>
                      <input
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Happy Paws Grooming"
                        className={inputBase}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium text-gray-700"
                        htmlFor="description"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={5}
                        placeholder="Short description of your service."
                        className={`${inputBase} min-h-[120px] resize-y`}
                      />
                    </div>
                  </div>
                </section>

                {/* Location */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Location
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4">
                    <LocationField formId="create-listing-form" />
                  </div>
                </section>
              </div>

              {/* Right column: Media */}
              <div className="space-y-8">
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Media
                  </h3>
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/30 p-4">
                    <ImageDropzone />
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium text-gray-700"
                        htmlFor="featuredImageUrl"
                      >
                        Or featured image URL (optional)
                      </label>
                      <input
                        id="featuredImageUrl"
                        name="featuredImageUrl"
                        type="url"
                        placeholder="https://cdn.example.com/featured.jpg"
                        className={inputBase}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
              >
                Save Draft
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                      <p className="text-xs text-gray-500">Slug: {listing.slug}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Ratings: {listing.rating_average ?? "–"} ({listing.rating_count ?? 0})
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {listing.status}
                      </span>
                      {listing.status === "draft" ? (
                        <form action={publishListing} className="inline">
                          <input type="hidden" name="id" value={listing.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Publish
                          </button>
                        </form>
                      ) : listing.status === "published" ? (
                        <form action={unpublishListing} className="inline">
                          <input type="hidden" name="id" value={listing.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
                          >
                            Unpublish
                          </button>
                        </form>
                      ) : null}
                      <DeleteListingButton
                        listingId={listing.id}
                        listingTitle={listing.title}
                        deleteAction={deleteListing}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
