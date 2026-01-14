import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { respondToReview, upsertDataForSeoSource } from "@/app/actions/listings";

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

  const { data: sources = [] } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("external_review_sources")
          .select("entity_id, target, target_type, enabled, last_fetched_at, last_error")
          .eq("provider", "dataforseo")
          .in("entity_id", listingIds);

  const { data: reviews = [] } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("reviews")
          .select("id, listing_id, rating, title, content, status, owner_response, created_at, reviewer_type, expert_domain, is_mystery_shopper")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

  return { user, listings: listings || [], reviews: reviews || [], sources: sources || [] };
}

export default async function ReviewsPage() {
  const { user, listings, reviews, sources } = await getContext();

  if (!user) {
    redirect("/signin");
  }

  const listingLookup = (listings || []).reduce<Record<string, string>>((acc, l: any) => {
    acc[l.id] = l.title;
    return acc;
  }, {});

  const sourceLookup = (sources || []).reduce<Record<string, any>>((acc, s: any) => {
    acc[s.entity_id] = s;
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
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">External reviews (DataForSEO)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Link each listing to a DataForSEO target (place id / URL) so external reviews can be ingested and displayed.
            </p>
            <div className="mt-4 space-y-4">
              {(listings || []).map((l: any) => {
                const src = sourceLookup[l.id];
                return (
                  <div key={l.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{l.title}</p>
                        {src?.target ? (
                          <p className="text-xs text-gray-600">
                            Target: <span className="font-mono">{src.target}</span>{" "}
                            ({src.target_type || "generic"})
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">No DataForSEO target configured.</p>
                        )}
                        {src?.last_error ? (
                          <p className="mt-1 text-xs text-red-600">Last error: {src.last_error}</p>
                        ) : null}
                      </div>
                      <form action={upsertDataForSeoSource} className="flex flex-col gap-2">
                        <input type="hidden" name="entityId" value={l.id} />
                        <div className="flex gap-2">
                          <input
                            name="targetType"
                            placeholder="target type (e.g., google_maps_place_id)"
                            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            defaultValue={src?.target_type || "generic"}
                          />
                          <input
                            name="target"
                            placeholder="DataForSEO target"
                            className="w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            defaultValue={src?.target || ""}
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-fit rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
                        >
                          Save target
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

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
                  {review.reviewer_type === "expert" ? (
                    <p className="text-xs font-medium text-indigo-700">
                      PawPointers Expert
                      {review.expert_domain ? ` • ${String(review.expert_domain).replace("_", " ")}` : ""}
                      {review.is_mystery_shopper ? " • Mystery shopper" : ""}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-gray-600">Pet Parent</p>
                  )}
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

