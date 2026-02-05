"use client";

import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";

interface ModerationQueueItem {
  id: string;
  review_id: string;
  moderation_status: "pending" | "approved" | "rejected" | "escalated";
  ai_moderation_status: "pending" | "approved" | "rejected" | "needs_review" | null;
  ai_moderation_score: number | null;
  ai_moderation_reasons: any;
  bot_detection_score: number | null;
  bot_detection_reasons: string[] | null;
  priority: "low" | "normal" | "high" | "urgent";
  flagged_reason: string | null;
  auto_flag_reasons: string[] | null;
  created_at: string;
  ai_processed_at: string | null;
  reviews: {
    id: string;
    listing_id: string;
    user_id: string;
    rating: number;
    title: string | null;
    content: string | null;
    status: string;
    created_at: string;
    reviewer_type: string;
    listings?: {
      id: string;
      title: string;
      slug: string;
    } | null;
    users?: {
      id: string;
      email: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    rejected: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    escalated: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
    needs_review: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status.toLowerCase()] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[priority.toLowerCase()] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <span
      key={i}
      className={`text-sm ${
        i < rating ? "text-yellow-400" : "text-gray-300"
      }`}
    >
      ★
    </span>
  ));
};

export default function ReviewModerationPage() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [aiStatusFilter, setAiStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadModerationQueue();
  }, [statusFilter, aiStatusFilter]);

  const loadModerationQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (aiStatusFilter !== "all") {
        params.append("aiStatus", aiStatusFilter);
      }

      const response = await fetch(`/api/reviews/moderation?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to load moderation queue");
      }

      setItems(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (
    queueId: string,
    action: "approve" | "reject" | "escalate"
  ) => {
    try {
      const response = await fetch("/api/reviews/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_id: queueId,
          moderation_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "escalated",
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update moderation status");
      }

      await loadModerationQueue();
      setSelectedItem(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "escalate") => {
    if (selectedIds.size === 0) {
      alert("Please select items to moderate");
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedIds.size} review(s)?`)) {
      return;
    }

    try {
      const response = await fetch("/api/reviews/moderation/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_ids: Array.from(selectedIds),
          action,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to perform bulk action");
      }

      setSelectedIds(new Set());
      await loadModerationQueue();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredItems = items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Review Moderation
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage review moderation queue with AI-powered content analysis
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={aiStatusFilter}
              onChange={(e) => setAiStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="all">All AI Status</option>
              <option value="pending">AI Pending</option>
              <option value="approved">AI Approved</option>
              <option value="rejected">AI Rejected</option>
              <option value="needs_review">Needs Review</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("approve")}
            >
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("reject")}
            >
              Reject Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("escalate")}
            >
              Escalate Selected
            </Button>
          </div>
        )}
      </div>

      {/* Moderation Queue Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Loading moderation queue...
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <div className="inline-block rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="font-medium text-red-600 dark:text-red-400">
              Error loading moderation queue
            </p>
            <p className="mt-1 text-sm text-red-500 dark:text-red-500">{error}</p>
            <button
              onClick={loadModerationQueue}
              className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          No reviews in moderation queue
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
          <Table className="divide-y divide-gray-100 dark:divide-gray-800">
            <TableHeader className="bg-gray-50/80 dark:bg-gray-800/60">
              <TableRow>
                <TableCell isHeader className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredItems.map((item) => item.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                {[
                  "Review",
                  "Rating",
                  "Status",
                  "AI Status",
                  "AI Score",
                  "Bot Score",
                  "Priority",
                  "Created",
                  "Actions",
                ].map((label) => (
                  <TableCell
                    key={label}
                    isHeader
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white dark:bg-gray-900">
              {filteredItems.map((item) => {
                const review = item.reviews;
                return (
                  <TableRow
                    key={item.id}
                    className="border-b border-gray-100 last:border-none dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <TableCell className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(item.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {review.listings?.title || "Unknown Listing"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {review.content || review.title || "No content"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          by {review.users?.full_name || review.users?.email || "Unknown"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                        <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                          {review.rating}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={item.moderation_status} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {item.ai_moderation_status ? (
                        <StatusBadge status={item.ai_moderation_status} />
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {item.ai_moderation_score !== null ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {(item.ai_moderation_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {item.bot_detection_score !== null ? (
                        <span
                          className={`text-sm font-medium ${
                            item.bot_detection_score > 0.7
                              ? "text-red-600 dark:text-red-400"
                              : item.bot_detection_score > 0.5
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {(item.bot_detection_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <PriorityBadge priority={item.priority} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {item.moderation_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerate(item.id, "approve")}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerate(item.id, "reject")}
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItem(item)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Review Moderation Details
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Review Content */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Review Content
                </h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      {renderStars(selectedItem.reviews.rating)}
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedItem.reviews.rating}/5
                      </span>
                    </div>
                    <StatusBadge status={selectedItem.reviews.status} />
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedItem.reviews.content || selectedItem.reviews.title || "No content"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Listing: {selectedItem.reviews.listings?.title || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reviewer: {selectedItem.reviews.users?.full_name || selectedItem.reviews.users?.email || "Unknown"}
                  </p>
                </div>
              </div>

              {/* AI Moderation Results */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  AI Moderation Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      AI Status
                    </span>
                    {selectedItem.ai_moderation_status ? (
                      <StatusBadge status={selectedItem.ai_moderation_status} />
                    ) : (
                      <span className="text-sm text-gray-400">Pending</span>
                    )}
                  </div>
                  {selectedItem.ai_moderation_score !== null && (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confidence Score
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(selectedItem.ai_moderation_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {selectedItem.bot_detection_score !== null && (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bot Detection Score
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          selectedItem.bot_detection_score > 0.7
                            ? "text-red-600 dark:text-red-400"
                            : selectedItem.bot_detection_score > 0.5
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {(selectedItem.bot_detection_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {selectedItem.ai_moderation_reasons && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        AI Analysis Details
                      </p>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                        {JSON.stringify(selectedItem.ai_moderation_reasons, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedItem.bot_detection_reasons && selectedItem.bot_detection_reasons.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bot Detection Reasons
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {selectedItem.bot_detection_reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Moderation Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {selectedItem.moderation_status === "pending" && (
                  <>
                    <Button onClick={() => handleModerate(selectedItem.id, "approve")}>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="outline" onClick={() => handleModerate(selectedItem.id, "reject")}>
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button variant="outline" onClick={() => handleModerate(selectedItem.id, "escalate")}>
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
