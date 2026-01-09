import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { addImage, deleteImage } from "@/app/actions/listings";

async function getUserAndListings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, listings: [] as any[] };
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return { user, listings: listings || [] };
}

export default async function MediaPage() {
  const { user, listings } = await getUserAndListings();

  if (!user) {
    redirect("/signin");
  }

  const supabase = await createClient();
  const listingIds = (listings || []).map((l: any) => l.id);

  const { data: images = [] } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("listing_images")
          .select("id, listing_id, cdn_url, storage_key, alt_text, display_order, created_at")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

  const imagesByListing = listingIds.reduce<Record<string, any[]>>((acc, id) => {
    acc[id] = (images || []).filter((img: any) => img.listing_id === id);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Media</h1>
        <p className="text-sm text-gray-600">
          Add image URLs for your listings. Use a CDN or storage bucket URL you control.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Add image</h2>
        <form action={addImage} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="listingId">
              Listing
            </label>
            <select id="listingId" name="listingId" required>
              <option value="">Select listing</option>
              {(listings || []).map((listing: any) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="imageUrl">
              Image URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://cdn.example.com/photo.jpg"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="altText">
              Alt text (optional)
            </label>
            <input id="altText" name="altText" type="text" placeholder="Describe the image" />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
            >
              Add image
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Gallery</h2>
        {(listings || []).length === 0 ? (
          <p className="text-sm text-gray-600">Create a listing first to add media.</p>
        ) : (
          (listings || []).map((listing: any) => (
            <div key={listing.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Listing</p>
                  <p className="text-base font-semibold text-gray-900">{listing.title}</p>
                </div>
                <span className="text-xs text-gray-400">Slug: {listing.slug}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(imagesByListing[listing.id] || []).map((img) => (
                  <div key={img.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {img.storage_key || img.cdn_url}
                      </p>
                      <form action={deleteImage}>
                        <input type="hidden" name="imageId" value={img.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Alt: {img.alt_text || "Not set"}
                    </p>
                  </div>
                ))}
                {(imagesByListing[listing.id] || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No images yet.</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

