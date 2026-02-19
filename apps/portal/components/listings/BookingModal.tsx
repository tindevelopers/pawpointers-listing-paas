"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  available: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  isLoggedIn?: boolean;
  onBookingSuccess?: (bookingId: string) => void;
}

const DEFAULT_TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
];

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${(m || 0).toString().padStart(2, "0")} ${suffix}`;
}

export function BookingModal({ isOpen, onClose, listingId, listingTitle, isLoggedIn = true, onBookingSuccess }: BookingModalProps) {
  const [bookingStep, setBookingStep] = useState<"date" | "service" | "confirmation" | "success">("date");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [petName, setPetName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const fetchAvailability = useCallback(async (date: string) => {
    setIsLoadingSlots(true);
    setSelectedTime("");
    try {
      const res = await fetch(
        `/api/booking/availability?listingId=${encodeURIComponent(listingId)}&dateFrom=${date}&dateTo=${date}`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data?.slots?.length > 0) {
        const available = (json.data.slots as AvailabilitySlot[])
          .filter((s) => s.available && s.startTime)
          .map((s) => to12Hour(s.startTime!));
        setTimeSlots(available.length > 0 ? available : DEFAULT_TIME_SLOTS);
      } else {
        setTimeSlots(DEFAULT_TIME_SLOTS);
      }
    } catch {
      setTimeSlots(DEFAULT_TIME_SLOTS);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, fetchAvailability]);

  if (!isOpen) return null;

  const services = [
    { id: "full-grooming", name: "Full Grooming", duration: "2 hours", price: "$85" },
    { id: "bath-wash", name: "Bath & Wash", duration: "1 hour", price: "$45" },
    { id: "nail-trim", name: "Nail Trimming", duration: "30 minutes", price: "$25" },
    { id: "de-shedding", name: "De-shedding", duration: "1.5 hours", price: "$55" },
  ];

  const handleBookingConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const to24 = (t: string) => {
        const isPm = t.includes("PM");
        const [h, m] = t.replace(/\s*(AM|PM)/, "").split(":").map(Number);
        const hour = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
        return `${hour.toString().padStart(2, "0")}:${(m || 0).toString().padStart(2, "0")}`;
      };
      const time24 = to24(selectedTime);
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          startDate: selectedDate,
          endDate: selectedDate,
          startTime: time24,
          endTime: time24,
          guestCount: 1,
          guestDetails: petName ? { primaryContact: { name: petName } } : undefined,
          specialRequests: specialRequests || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }
      const bookingId = data.data?.bookingId;
      setBookingStep("success");
      onBookingSuccess?.(bookingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${isLoggedIn ? "max-w-2xl" : "max-w-md"} w-full overflow-hidden flex flex-col max-h-[90vh]`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="float-right text-white hover:text-orange-100 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold mb-2">Book Now</h2>
            <p className="text-orange-100 text-sm">{listingTitle}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoggedIn ? (
              // LOGGED IN - Booking Form
              <div>
                {/* Progress Indicator */}
                {bookingStep !== "success" && (
                <div className="flex justify-between mb-8">
                  {["date", "service", "confirmation"].map((step, idx) => (
                    <div key={step} className="flex items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                          bookingStep === step
                            ? "bg-orange-500 text-white"
                            : idx < ["date", "service", "confirmation"].indexOf(bookingStep)
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {idx < 2 && (
                        <div className={`flex-1 h-1 mx-2 ${
                          idx < ["date", "service", "confirmation"].indexOf(bookingStep)
                            ? "bg-green-500"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                )}

                {/* Step 1: Date Selection */}
                {bookingStep === "date" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Date & Time</h3>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Preferred Time
                      </label>
                      {isLoadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
                          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading available times...</span>
                        </div>
                      ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-2 text-sm rounded-lg transition-all ${
                              selectedTime === time
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                      )}
                    </div>

                    <button
                      onClick={() => setBookingStep("service")}
                      disabled={!selectedDate || !selectedTime}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Step 2: Service Selection */}
                {bookingStep === "service" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Service</h3>

                    <div className="mb-6 space-y-3">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => setSelectedService(service.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedService === service.id
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                              : "border-gray-200 dark:border-gray-600 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">{service.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{service.duration}</p>
                            </div>
                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{service.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Pet Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Max, Bella"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Special Requests (optional)
                      </label>
                      <textarea
                        placeholder="Any special instructions or requests?"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setBookingStep("date")}
                        className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setBookingStep("confirmation")}
                        disabled={!selectedService}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        Review Booking
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {bookingStep === "confirmation" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Confirm Booking</h3>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Service</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {services.find((s) => s.id === selectedService)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date</span>
                        <span className="font-bold text-gray-900 dark:text-white">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time</span>
                        <span className="font-bold text-gray-900 dark:text-white">{selectedTime}</span>
                      </div>
                      {petName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pet Name</span>
                          <span className="font-bold text-gray-900 dark:text-white">{petName}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">Total Price</span>
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                          {services.find((s) => s.id === selectedService)?.price}
                        </span>
                      </div>
                    </div>

                    {error && (
                      <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setBookingStep("service")}
                        disabled={isSubmitting}
                        className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBookingConfirm}
                        disabled={isSubmitting}
                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        {isSubmitting ? "Creating..." : "Confirm Booking"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Success */}
                {bookingStep === "success" && (
                  <div className="text-center">
                    <div className="flex justify-center mb-6">
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                        <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Your appointment at <span className="font-semibold">{listingTitle}</span> has been booked.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Service</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {services.find((s) => s.id === selectedService)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{selectedTime}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Link
                        href="/account/bookings"
                        className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 text-center"
                      >
                        View My Bookings
                      </Link>
                      <button
                        onClick={onClose}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // NOT LOGGED IN - Sign Up Prompt
              <div>
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-4">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
                  Create an Account
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                  To complete your booking, you need to create a PawPointers account. This will allow you to manage your bookings, save favorites, and receive updates.
                </p>

                {/* Benefits */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Secure booking management</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Save favorite providers</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Get exclusive offers</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Link
                    href="/auth/signup"
                    className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 text-center"
                  >
                    Create Account
                  </Link>
                  <button
                    onClick={onClose}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-bold py-3 px-4 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>

                {/* Sign In Link */}
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
