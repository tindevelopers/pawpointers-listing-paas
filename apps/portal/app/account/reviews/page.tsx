import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getUserReviews() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, reviews: [] };
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      id,
      listing_id,
      rating,
      title,
      content,
      status,
      created_at,
      updated_at,
      review_moderation_queue (
        moderation_status,
        ai_moderation_status,
        ai_moderation_score,
        bot_detection_score,
        flagged_reason,
        moderation_notes
      ),
      listings:listing_id (
        id,
        title,
        slug
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { user, reviews: reviews || [] };
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    needs_review: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status.toLowerCase()] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <span
      key={i}
      className={`text-lg ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
    >
      ★
    </span>
  ));
};

export default async function UserReviewsPage() {
  const { user, reviews } = await getUserReviews();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          My Reviews
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage your submitted reviews
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            You haven't submitted any reviews yet.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Browse listings →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => {
            const moderationQueue = review.review_moderation_queue?.[0];
            return (
              <div
                key={review.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Link
                        href={`/listings/${review.listings?.slug || review.listing_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {review.listings?.title || "Listing"}
                      </Link>
                    </div>

                    <div className="mb-3 flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {review.rating}/5
                      </span>
                    </div>

                    {review.title && (
                      <h3 className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                        {review.title}
                      </h3>
                    )}

                    {review.content && (
                      <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                        {review.content}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Submitted: {new Date(review.created_at).toLocaleDateString()}
                      </span>
                      {review.updated_at !== review.created_at && (
                        <span>
                          Updated: {new Date(review.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Moderation Status */}
                    {moderationQueue && (
                      <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Moderation Status:
                          </span>
                          <StatusBadge status={review.status} />
                          {moderationQueue.ai_moderation_status && (
                            <>
                              <span className="text-xs text-gray-500">•</span>
                              <StatusBadge status={moderationQueue.ai_moderation_status} />
                            </>
                          )}
                        </div>

                        {moderationQueue.moderation_status === "pending" && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⏳ Your review is pending moderation and will be visible once approved.
                          </p>
                        )}

                        {moderationQueue.moderation_status === "rejected" && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                              ❌ Your review was rejected
                            </p>
                            {moderationQueue.moderation_notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Reason: {moderationQueue.moderation_notes}
                              </p>
                            )}
                            {moderationQueue.flagged_reason && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Flagged: {moderationQueue.flagged_reason}
                              </p>
                            )}
                          </div>
                        )}

                        {moderationQueue.ai_moderation_score !== null && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            AI Confidence: {(moderationQueue.ai_moderation_score * 100).toFixed(0)}%
                          </p>
                        )}

                        {moderationQueue.bot_detection_score !== null &&
                          moderationQueue.bot_detection_score > 0.5 && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              ⚠️ Bot detection score:{" "}
                              {(moderationQueue.bot_detection_score * 100).toFixed(0)}%
                            </p>
                          )}
                      </div>
                    )}

                    {/* Edit option for pending reviews */}
                    {review.status === "pending" && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                          You can edit your review while it's pending moderation.
                        </p>
                        <Link
                          href={`/listings/${review.listings?.slug || review.listing_id}#reviews`}
                          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Edit Review
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
