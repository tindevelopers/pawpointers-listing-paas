"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { 
  ArrowLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { Booking, BookingStatus, PaymentStatus, useBooking } from "@listing-platform/booking/client";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const { cancelBooking, isSubmitting } = useBooking();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch booking data - TODO: Replace with actual API call using bookingId
  // For now using mock data structure
  const mockBooking: Booking = {
    id: bookingId,
    listingId: "listing-1",
    userId: "user-1",
    tenantId: "tenant-1",
    startDate: "2025-01-20",
    endDate: "2025-01-22",
    startTime: "14:00",
    endTime: "11:00",
    guestCount: 2,
    guestDetails: {
      guests: [
        { name: "John Doe", age: 35 },
        { name: "Jane Doe", age: 32 },
      ],
      primaryContact: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
      },
    },
    basePrice: 200.0,
    serviceFee: 20.0,
    taxAmount: 18.0,
    discountAmount: 0,
    totalAmount: 238.0,
    currency: "USD",
    paymentStatus: "paid",
    paymentIntentId: "pi_1234567890",
    paymentMethod: "card",
    paidAt: "2025-01-15T10:30:00Z",
    status: "confirmed",
    confirmationCode: "BK-2025-001",
    specialRequests: "Late check-in requested (after 6 PM)",
    internalNotes: "VIP customer - provide welcome basket",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:30:00Z",
  };

  // TODO: Fetch real booking data
  // const { data: bookingData, isLoading, error } = await fetch(`/api/bookings/${bookingId}`);
  // const booking = bookingData;
  const booking = mockBooking;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBooking({
        bookingId: booking.id,
        reason: cancelReason,
      });
      setShowCancelModal(false);
      // In a real app, you'd redirect or refresh the page
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={`Booking ${booking.confirmationCode}`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/saas/bookings">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                Booking {booking.confirmationCode}
              </h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Created on {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {booking.status === "confirmed" && (
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-4">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColors[booking.status]}`}
          >
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${paymentStatusColors[booking.paymentStatus]}`}
          >
            Payment: {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Booking Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dates</p>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </p>
                    {booking.startTime && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Check-in: {booking.startTime} | Check-out: {booking.endTime || "11:00 AM"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <UserGroupIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Guests</p>
                    <p className="text-gray-900 dark:text-white">
                      {booking.guestCount} {booking.guestCount === 1 ? "guest" : "guests"}
                    </p>
                    {booking.guestDetails?.guests && (
                      <div className="mt-2 space-y-1">
                        {booking.guestDetails.guests.map((guest, idx) => (
                          <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                            {guest.name}
                            {guest.age && ` (Age: ${guest.age})`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {booking.specialRequests && (
                  <div className="flex items-start gap-4">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Special Requests
                      </p>
                      <p className="text-gray-900 dark:text-white">{booking.specialRequests}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Contact Information */}
            {booking.guestDetails?.primaryContact && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Contact Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-gray-900 dark:text-white">
                      {booking.guestDetails.primaryContact.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white">
                      {booking.guestDetails.primaryContact.email}
                    </p>
                  </div>
                  {booking.guestDetails.primaryContact.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-gray-900 dark:text-white">
                        {booking.guestDetails.primaryContact.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Internal Notes */}
            {booking.internalNotes && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Internal Notes
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{booking.internalNotes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Summary */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Pricing Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Base Price</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(booking.basePrice, booking.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(booking.serviceFee, booking.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(booking.taxAmount, booking.currency)}
                  </span>
                </div>
                {booking.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span className="font-medium">-{formatCurrency(booking.discountAmount, booking.currency)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Payment Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[booking.paymentStatus]}`}
                  >
                    {booking.paymentStatus}
                  </span>
                </div>
                {booking.paidAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid At</p>
                    <p className="text-gray-900 dark:text-white">{formatDateTime(booking.paidAt)}</p>
                  </div>
                )}
                {booking.paymentMethod && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Payment Method
                    </p>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {booking.paymentMethod}
                    </p>
                  </div>
                )}
                {booking.paymentIntentId && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Payment Intent ID
                    </p>
                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {booking.paymentIntentId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation Info */}
            {booking.cancelledAt && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                <h2 className="mb-4 text-lg font-semibold text-red-900 dark:text-red-400">
                  Cancellation Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Cancelled At
                    </p>
                    <p className="text-red-900 dark:text-red-400">
                      {formatDateTime(booking.cancelledAt)}
                    </p>
                  </div>
                  {booking.cancellationReason && (
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">Reason</p>
                      <p className="text-red-900 dark:text-red-400">
                        {booking.cancellationReason}
                      </p>
                    </div>
                  )}
                  {booking.refundAmount && (
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Refund Amount
                      </p>
                      <p className="text-lg font-bold text-red-900 dark:text-red-400">
                        {formatCurrency(booking.refundAmount, booking.currency)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Cancel Booking
            </h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cancellation Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Enter reason for cancellation..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Keep Booking
              </Button>
              <Button
                variant="primary"
                onClick={handleCancelBooking}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

