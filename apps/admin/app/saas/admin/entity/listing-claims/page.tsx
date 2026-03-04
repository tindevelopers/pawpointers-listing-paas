"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getListingClaims,
  reviewListingClaim,
  type ListingClaimRecord,
} from "@/app/actions/listing-claims";

type ClaimFilter = "all" | "draft" | "submitted" | "provisional" | "approved" | "rejected";

const FILTERS: Array<{ id: ClaimFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "provisional", label: "Provisional" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "draft", label: "Draft" },
];

export default function ListingClaimsPage() {
  const [claims, setClaims] = useState<ListingClaimRecord[]>([]);
  const [filter, setFilter] = useState<ClaimFilter>("all");
  const [loading, setLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadClaims(nextFilter: ClaimFilter = filter) {
    try {
      setLoading(true);
      setError(null);
      const data = await getListingClaims(nextFilter === "all" ? undefined : nextFilter);
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing claims");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims(filter);
  }, [filter]);

  const stats = useMemo(() => {
    return {
      total: claims.length,
      pending: claims.filter((claim) => ["submitted", "provisional"].includes(claim.status)).length,
      approved: claims.filter((claim) => claim.status === "approved").length,
      rejected: claims.filter((claim) => claim.status === "rejected").length,
    };
  }, [claims]);

  async function handleReview(claimId: string, decision: "approve" | "reject") {
    setIsReviewing(claimId);
    setError(null);
    try {
      const notes =
        decision === "reject"
          ? window.prompt("Optional rejection reason (displayed to support team):") || undefined
          : window.prompt("Optional approval notes:") || undefined;

      const result = await reviewListingClaim(claimId, decision, notes);
      if (!result.success) {
        throw new Error(result.error || "Failed to review claim");
      }
      await loadClaims(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review claim");
    } finally {
      setIsReviewing(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-8 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">Entity Management</p>
        <h1 className="mt-2 text-4xl font-semibold">Listing Claims Queue</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/90">
          Review ownership claims from businesses, approve legitimate owners, and reject suspicious claims.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total in view</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pending review</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{stats.rejected}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === item.id
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-600">Loading claims...</p>
        ) : claims.length === 0 ? (
          <p className="text-sm text-gray-600">No listing claims found for this filter.</p>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <article key={claim.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-gray-900">
                      {claim.listing?.title || "Listing"}
                    </p>
                    <p className="text-sm text-gray-500">Slug: {claim.listing?.slug || "n/a"}</p>
                    <p className="text-sm text-gray-700">
                      Claimant:{" "}
                      <span className="font-medium">
                        {claim.claimant?.full_name || claim.claimant?.email || claim.claimant_user_id}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {claim.submitted_at ? new Date(claim.submitted_at).toLocaleString() : "n/a"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      claim.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : claim.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 md:grid-cols-2">
                  <p>
                    <span className="font-medium">Business email:</span>{" "}
                    {String((claim.verification as any)?.contact?.email || "n/a")}
                  </p>
                  <p>
                    <span className="font-medium">Business phone:</span>{" "}
                    {String((claim.verification as any)?.contact?.phone || "n/a")}
                  </p>
                  <p>
                    <span className="font-medium">Website:</span>{" "}
                    {String((claim.verification as any)?.contact?.website || "n/a")}
                  </p>
                  <p>
                    <span className="font-medium">Google Business:</span>{" "}
                    {String((claim.verification as any)?.contact?.googleBusinessUrl || "n/a")}
                  </p>
                </div>

                {claim.review_notes ? (
                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-medium">Review notes:</span> {claim.review_notes}
                  </p>
                ) : null}
                {claim.rejection_reason ? (
                  <p className="mt-1 text-sm text-rose-700">
                    <span className="font-medium">Rejection reason:</span> {claim.rejection_reason}
                  </p>
                ) : null}

                {["submitted", "provisional", "draft"].includes(claim.status) ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={isReviewing === claim.id}
                      onClick={() => handleReview(claim.id, "approve")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Approve + assign owner
                    </button>
                    <button
                      disabled={isReviewing === claim.id}
                      onClick={() => handleReview(claim.id, "reject")}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Reject claim
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
