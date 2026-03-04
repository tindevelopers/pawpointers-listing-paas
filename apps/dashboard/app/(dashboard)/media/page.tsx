import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { addImage, deleteImage, setFeaturedImage } from "@/app/actions/listings";
import { getScopedListingIds } from "@/lib/listing-access";

async function getUserAndListings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, listings: [] as any[] };
  }

  const listingIds = await getScopedListingIds(user.id);

  const { data: listings } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("listings")
          .select("id, title, slug, featured_image")
          .in("id", listingIds)
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
          Upload featured images to Supabase and supporting gallery images to Wasabi.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Set featured image</h2>
        <form action={setFeaturedImage} encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="featuredListingId">
              Listing
            </label>
            <select id="featuredListingId" name="listingId" required>
              <option value="">Select listing</option>
              {(listings || []).map((listing: any) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="featuredImageFile">
              Featured image file
            </label>
            <input id="featuredImageFile" name="featuredImageFile" type="file" accept="image/*" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="featuredImageUrl">
              Or featured image URL
            </label>
            <input
              id="featuredImageUrl"
              name="featuredImageUrl"
              type="url"
              placeholder="https://cdn.example.com/featured.jpg"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600"
            >
              Save featured image
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Add gallery image</h2>
        <form action={addImage} encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="galleryListingId">
              Listing
            </label>
            <select id="galleryListingId" name="listingId" required>
              <option value="">Select listing</option>
              {(listings || []).map((listing: any) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="imageFile">
              Image file
            </label>
            <input id="imageFile" name="imageFile" type="file" accept="image/*" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="imageUrl">
              Or image URL
            </label>
            <input id="imageUrl" name="imageUrl" type="url" placeholder="https://cdn.example.com/photo.jpg" />
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
              className="bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600"
            >
              Add gallery image
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
                  <p className="mt-1 text-xs text-gray-500 truncate">
                    Featured: {listing.featured_image || "Not set"}
                  </p>
                </div>
                <span className="text-xs text-gray-400">Slug: {listing.slug}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(imagesByListing[listing.id] || []).map((img: any) => (
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
