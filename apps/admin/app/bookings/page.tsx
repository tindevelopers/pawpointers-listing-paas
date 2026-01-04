"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { 
  EyeIcon, 
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { useBookings, Booking, BookingStatus, PaymentStatus } from "@listing-platform/booking/client";
import Link from "next/link";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-500",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-500",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-500",
  no_show: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-500",
  paid: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-500",
  refunded: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-500",
};

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  
  // Use the booking hook to fetch real data
  const { bookings, isLoading, error, refetch } = useBookings({
    status: statusFilter !== "all" ? statusFilter as BookingStatus : undefined,
    paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter as PaymentStatus : undefined,
  });

  // Mock data fallback for demonstration (remove when you have real data)
  const mockBookings: Booking[] = [
    {
      id: "1",
      listingId: "listing-1",
      userId: "user-1",
      tenantId: "tenant-1",
      startDate: "2025-01-20",
      endDate: "2025-01-22",
      startTime: "14:00",
      endTime: "11:00",
      guestCount: 2,
      basePrice: 200.0,
      serviceFee: 20.0,
      taxAmount: 18.0,
      discountAmount: 0,
      totalAmount: 238.0,
      currency: "USD",
      paymentStatus: "paid",
      status: "confirmed",
      confirmationCode: "BK-2025-001",
      createdAt: "2025-01-15T10:00:00Z",
      updatedAt: "2025-01-15T10:00:00Z",
    },
    {
      id: "2",
      listingId: "listing-2",
      userId: "user-2",
      tenantId: "tenant-1",
      startDate: "2025-01-25",
      endDate: "2025-01-27",
      guestCount: 4,
      basePrice: 350.0,
      serviceFee: 35.0,
      taxAmount: 31.5,
      discountAmount: 50.0,
      totalAmount: 366.5,
      currency: "USD",
      paymentStatus: "pending",
      status: "pending",
      confirmationCode: "BK-2025-002",
      createdAt: "2025-01-16T14:30:00Z",
      updatedAt: "2025-01-16T14:30:00Z",
    },
    {
      id: "3",
      listingId: "listing-1",
      userId: "user-3",
      tenantId: "tenant-1",
      startDate: "2025-01-18",
      endDate: "2025-01-19",
      guestCount: 1,
      basePrice: 150.0,
      serviceFee: 15.0,
      taxAmount: 13.5,
      discountAmount: 0,
      totalAmount: 178.5,
      currency: "USD",
      paymentStatus: "refunded",
      status: "cancelled",
      confirmationCode: "BK-2025-003",
      cancelledAt: "2025-01-17T09:00:00Z",
      refundAmount: 178.5,
      createdAt: "2025-01-10T08:00:00Z",
      updatedAt: "2025-01-17T09:00:00Z",
    },
  ];

  // Use real bookings data, fallback to mock for demo
  const bookingsToDisplay = bookings.length > 0 ? bookings : mockBookings;
  
  const filteredBookings = bookingsToDisplay.filter((booking) => {
    const matchesSearch =
      booking.confirmationCode.toLowerCase().includes(search.toLowerCase()) ||
      booking.listingId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === "all" || booking.paymentStatus === paymentStatusFilter;
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Bookings" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Bookings</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage and track all bookings and reservations
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/bookings/availability">
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Availability Calendar
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by confirmation code or listing..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
            </select>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Confirmation Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Listing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Loading bookings...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-red-500">
                      Error loading bookings: {error.message}
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {booking.confirmationCode}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {booking.listingId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>{formatDate(booking.startDate)}</div>
                        {booking.endDate !== booking.startDate && (
                          <div className="text-xs text-gray-500">to {formatDate(booking.endDate)}</div>
                        )}
                        {booking.startTime && (
                          <div className="text-xs text-gray-500">{booking.startTime}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {booking.guestCount} {booking.guestCount === 1 ? "guest" : "guests"}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(booking.totalAmount, booking.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[booking.paymentStatus]}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/bookings/${booking.id}`}>
                            <Button variant="outline" size="sm">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

