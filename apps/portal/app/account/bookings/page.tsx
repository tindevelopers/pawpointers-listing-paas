"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/database/client";

interface BookingListing {
  id: string;
  title: string;
  slug: string;
  images?: string[];
}

interface Booking {
  id: string;
  listing_id: string;
  status: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  guest_count: number;
  special_requests?: string;
  base_price: number;
  service_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_status: string;
  confirmation_code?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  listings?: BookingListing;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${(m || 0).toString().padStart(2, "0")} ${suffix}`;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/signin");
        }
      } catch {
        router.push("/signin");
      }
    }
    checkAuth();
  }, [router]);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/booking/list?${params}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load bookings");
      }
      setBookings(json.data.bookings);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to cancel booking");
      }
      fetchBookings();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">
            Dashboard
          </Link>
          {" / "}
          <span className="text-gray-900 dark:text-white">My Bookings</span>
        </nav>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">My Bookings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage your appointments
        </p>
      </header>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              statusFilter === f.value
                ? "bg-orange-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchBookings}
            className="mt-4 text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-semibold"
          >
            Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {statusFilter === "all" ? "You don't have any bookings yet." : `No ${statusFilter} bookings found.`}
          </p>
          <Link
            href="/listings"
            className="inline-block text-orange-600 hover:text-orange-700 dark:text-orange-400 font-semibold"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {booking.listings?.title || "Unknown Listing"}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-800"}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <span className="font-medium">Date:</span> {formatDate(booking.start_date)}
                        {booking.start_time && (
                          <span> at {formatTime(booking.start_time)}</span>
                        )}
                      </p>
                      {booking.confirmation_code && (
                        <p>
                          <span className="font-medium">Confirmation:</span>{" "}
                          <span className="font-mono text-xs">{booking.confirmation_code}</span>
                        </p>
                      )}
                      {booking.special_requests && (
                        <p className="truncate">
                          <span className="font-medium">Notes:</span> {booking.special_requests}
                        </p>
                      )}
                      {booking.cancellation_reason && (
                        <p className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Cancellation reason:</span> {booking.cancellation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(booking.total_amount, booking.currency)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Booked {formatDate(booking.created_at)}
                    </span>
                    <div className="flex gap-2 mt-1">
                      {booking.listings?.slug && (
                        <Link
                          href={`/listings/${booking.listings.slug}`}
                          className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium"
                        >
                          View Listing
                        </Link>
                      )}
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium disabled:opacity-50"
                        >
                          {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
