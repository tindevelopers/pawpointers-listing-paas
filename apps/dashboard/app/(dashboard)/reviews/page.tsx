import { createClient } from "@/core/database/server";
import { redirect } from "next/navigation";
import { respondToExternalReview, respondToReview, upsertDataForSeoSource } from "@/app/actions/listings";
import { getScopedListingIds } from "@/lib/listing-access";
import { getDashboardEntitlementsForUser } from "@/lib/listing-access";
import { canAccessDashboardFeature } from "@/lib/subscription-entitlements";
import EntitlementGate from "@/components/EntitlementGate";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, listings: [] as any[], reviews: [] as any[] };
  }

  const listingIds = await getScopedListingIds(user.id);

  const { data: listings } =
    listingIds.length === 0
      ? { data: [] }
      : await supabase
          .from("listings")
          .select("id, title")
          .in("id", listingIds);
  const listingIdsFromRows = (listings || []).map((l: any) => l.id);

  const { data: sources = [] } =
    listingIdsFromRows.length === 0
      ? { data: [] }
      : await supabase
          .from("external_review_sources")
          .select("id, entity_id, provider, target, target_type, source_type, enabled, last_fetched_at, last_error")
          .in("entity_id", listingIdsFromRows);

  const { data: externalReviews = [] } =
    listingIdsFromRows.length === 0
      ? { data: [] }
      : await supabase
          .from("external_reviews")
          .select("id, entity_id, provider, source_type, source_review_id, source_url, author_name, rating, comment, reviewed_at, fetched_at")
          .in("entity_id", listingIdsFromRows)
          .order("reviewed_at", { ascending: false })
          .limit(200);

  const externalReviewIds = (externalReviews || []).map((r: any) => r.id);
  const { data: externalResponses = [] } =
    externalReviewIds.length === 0
      ? { data: [] }
      : await supabase
          .from("external_review_owner_responses")
          .select("external_review_id, response_text, status, updated_at, posted_at, last_error")
          .in("external_review_id", externalReviewIds);

  const { data: reviews = [] } =
    listingIdsFromRows.length === 0
      ? { data: [] }
      : await supabase
          .from("reviews")
          .select(`
            id, 
            listing_id, 
            rating, 
            title, 
            content, 
            status, 
            owner_response, 
            created_at, 
            reviewer_type, 
            expert_domain, 
            is_mystery_shopper,
            review_moderation_queue (
              moderation_status,
              ai_moderation_status,
              ai_moderation_score,
              bot_detection_score,
              flagged_reason,
              priority
            )
          `)
          .in("listing_id", listingIdsFromRows)
          .order("created_at", { ascending: false });

  return {
    user,
    listings: listings || [],
    reviews: reviews || [],
    sources: sources || [],
    externalReviews: externalReviews || [],
    externalResponses: externalResponses || [],
  };
}

export default async function ReviewsPage() {
  const { user, listings, reviews, sources, externalReviews, externalResponses } = await getContext();

  if (!user) {
    redirect("/signin");
  }

  const entitlements = await getDashboardEntitlementsForUser(user.id);
  const canAccessReviews = canAccessDashboardFeature(entitlements, "reviews");
  if (!canAccessReviews) {
    return (
      <EntitlementGate allowed={false} featureName="Reviews" requiredTier="middle" />
    );
  }

  const listingLookup = (listings || []).reduce<Record<string, string>>((acc, l: any) => {
    acc[l.id] = l.title;
    return acc;
  }, {});

  const sourceLookup = (sources || []).reduce<Record<string, any>>((acc, s: any) => {
    const key = `${s.entity_id}:${s.provider}`;
    acc[key] = s;
    return acc;
  }, {});

  const externalResponseLookup = (externalResponses || []).reduce<Record<string, any>>((acc, r: any) => {
    acc[String(r.external_review_id)] = r;
    return acc;
  }, {});

  const externalByListing = (externalReviews || []).reduce<Record<string, any[]>>((acc, r: any) => {
    const lid = String(r.entity_id);
    acc[lid] = acc[lid] || [];
    acc[lid].push(r);
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
            <h2 className="text-lg font-semibold text-gray-900">External reviews sources</h2>
            <p className="mt-1 text-sm text-gray-600">
              Link each listing to external review targets (DataForSEO, Yelp, etc) so reviews can be ingested and displayed.
            </p>
            <div className="mt-4 space-y-4">
              {(listings || []).map((l: any) => {
                const dataforseoSrc = sourceLookup[`${l.id}:dataforseo`];
                const yelpSrc = sourceLookup[`${l.id}:yelp`];
                return (
                  <div key={l.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{l.title}</p>
                        {dataforseoSrc?.target ? (
                          <p className="text-xs text-gray-600">
                            DataForSEO target: <span className="font-mono">{dataforseoSrc.target}</span>{" "}
                            ({dataforseoSrc.target_type || "generic"})
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">No DataForSEO target configured.</p>
                        )}
                        {dataforseoSrc?.last_error ? (
                          <p className="mt-1 text-xs text-red-600">DataForSEO last error: {dataforseoSrc.last_error}</p>
                        ) : null}
                        {yelpSrc?.target ? (
                          <p className="mt-1 text-xs text-gray-600">
                            Yelp target: <span className="font-mono">{yelpSrc.target}</span>{" "}
                            ({yelpSrc.target_type || "yelp_business_id"})
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">No Yelp target configured.</p>
                        )}
                        {yelpSrc?.last_error ? (
                          <p className="mt-1 text-xs text-red-600">Yelp last error: {yelpSrc.last_error}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-4">
                        <form action={upsertDataForSeoSource} className="flex flex-col gap-2">
                          <input type="hidden" name="entityId" value={l.id} />
                          <input type="hidden" name="provider" value="dataforseo" />
                          <div className="flex gap-2">
                            <input
                              name="targetType"
                              placeholder="target type (e.g., google_maps_place_id)"
                              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              defaultValue={dataforseoSrc?.target_type || "generic"}
                            />
                            <input
                              name="target"
                              placeholder="DataForSEO target"
                              className="w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              defaultValue={dataforseoSrc?.target || ""}
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-fit rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
                          >
                            Save DataForSEO target
                          </button>
                        </form>

                        <form action={upsertDataForSeoSource} className="flex flex-col gap-2">
                          <input type="hidden" name="entityId" value={l.id} />
                          <input type="hidden" name="provider" value="yelp" />
                          <div className="flex gap-2">
                            <input
                              name="targetType"
                              placeholder="target type (e.g., yelp_business_id)"
                              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              defaultValue={yelpSrc?.target_type || "yelp_business_id"}
                            />
                            <input
                              name="target"
                              placeholder="Yelp business id"
                              className="w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              defaultValue={yelpSrc?.target || ""}
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-fit rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
                          >
                            Save Yelp target
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">External reviews feed</h2>
            <p className="mt-1 text-sm text-gray-600">
              Reply to Google/Yelp reviews from here. If an upstream connection isn’t set up yet, responses will be saved in PawPointers and marked as needing authorization.
            </p>
            <div className="mt-4 space-y-6">
              {(listings || []).map((l: any) => {
                const rows = externalByListing[l.id] || [];
                if (rows.length === 0) return null;
                return (
                  <div key={l.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-gray-900">{l.title}</p>
                      <p className="text-xs text-gray-500">{rows.length} external reviews</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {rows.map((r: any) => {
                        const resp = externalResponseLookup[String(r.id)];
                        return (
                          <div key={r.id} className="rounded-lg border border-gray-100 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {r.author_name || "External reviewer"} • {r.rating ?? "?"}/5
                                </p>
                                <p className="text-xs text-gray-500">
                                  {r.source_type || "external"} via {r.provider || "provider"}
                                </p>
                                {r.comment ? (
                                  <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
                                ) : (
                                  <p className="mt-2 text-sm text-gray-500">No comment text.</p>
                                )}
                                {resp?.response_text ? (
                                  <div className="mt-3 rounded-lg bg-orange-50 p-3">
                                    <p className="text-xs font-semibold text-orange-800">Owner response</p>
                                    <p className="mt-1 text-sm text-gray-800">{resp.response_text}</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      Status: {resp.status || "pending"}
                                      {resp.last_error ? ` • Error: ${resp.last_error}` : ""}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <form action={respondToExternalReview} className="mt-4 space-y-2">
                              <input type="hidden" name="externalReviewId" value={r.id} />
                              <textarea
                                name="response"
                                rows={3}
                                placeholder="Write a reply (will be posted upstream when connected)."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                defaultValue={resp?.response_text || ""}
                              />
                              <button
                                type="submit"
                                className="bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600"
                              >
                                Save response
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(externalReviews || []).length === 0 ? (
                <p className="text-sm text-gray-600">No external reviews ingested yet.</p>
              ) : null}
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
                    <p className="text-xs font-medium text-orange-700">
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
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    review.status === 'approved' 
                      ? 'bg-green-100 text-green-700' 
                      : review.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : review.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {review.status}
                  </span>
                  {review.review_moderation_queue && review.review_moderation_queue.length > 0 && (
                    <div className="flex flex-col gap-1 text-xs">
                      {review.review_moderation_queue[0].ai_moderation_status && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          review.review_moderation_queue[0].ai_moderation_status === 'approved'
                            ? 'bg-blue-100 text-blue-700'
                            : review.review_moderation_queue[0].ai_moderation_status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          AI: {review.review_moderation_queue[0].ai_moderation_status}
                        </span>
                      )}
                      {review.review_moderation_queue[0].moderation_status === 'pending' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Awaiting Moderation
                        </span>
                      )}
                      {review.review_moderation_queue[0].flagged_reason && (
                        <span className="text-xs text-gray-500">
                          Flagged: {review.review_moderation_queue[0].flagged_reason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Owner response</p>
                {review.owner_response ? (
                  <div className="rounded-lg bg-orange-50 p-3 text-sm text-gray-800">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={review.owner_response || ""}
                />
                <button
                  type="submit"
                  className="bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600"
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
