import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { respondToReview } from "@/app/actions/listings";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, listings: [] as any[], reviews: [] as any[] };
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title")
    .eq("owner_id", user.id);

  const listingIds = (listings || []).map((l: any) => l.id);

  const { data: reviews = [] } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("reviews")
          .select("id, listing_id, rating, title, content, status, owner_response, created_at")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

  return { user, listings: listings || [], reviews: reviews || [] };
}

export default async function ReviewsPage() {
  const { user, listings, reviews } = await getContext();

  if (!user) {
    redirect("/signin");
  }

  const listingLookup = (listings || []).reduce<Record<string, string>>((acc, l: any) => {
    acc[l.id] = l.title;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-600">
          View reviews for your listings and post owner responses.
        </p>
      </header>

      {(reviews || []).length === 0 ? (
        <p className="text-sm text-gray-600">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {(reviews || []).map((review: any) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    {listingLookup[review.listing_id] || "Listing"}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {review.title || "Review"}
                  </p>
                  <p className="text-xs text-gray-500">Rating: {review.rating} / 5</p>
                  <p className="mt-2 text-sm text-gray-700">{review.content}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {review.status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Owner response</p>
                {review.owner_response ? (
                  <div className="rounded-lg bg-indigo-50 p-3 text-sm text-gray-800">
                    {review.owner_response}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No response yet.</p>
                )}
              </div>

              <form action={respondToReview} className="mt-4 space-y-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <textarea
                  name="response"
                  rows={3}
                  placeholder="Write a reply to this review."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  defaultValue={review.owner_response || ""}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
                >
                  Post response
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

