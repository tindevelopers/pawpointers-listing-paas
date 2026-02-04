"use client";

import Link from "next/link";
import { useState } from "react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingTitle: string;
  isLoggedIn?: boolean;
}

export function BookingModal({ isOpen, onClose, listingTitle, isLoggedIn = true }: BookingModalProps) {
  const [bookingStep, setBookingStep] = useState<"date" | "service" | "confirmation">("date");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [petName, setPetName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  if (!isOpen) return null;

  // Services available for booking
  const services = [
    { id: "full-grooming", name: "Full Grooming", duration: "2 hours", price: "$85" },
    { id: "bath-wash", name: "Bath & Wash", duration: "1 hour", price: "$45" },
    { id: "nail-trim", name: "Nail Trimming", duration: "30 minutes", price: "$25" },
    { id: "de-shedding", name: "De-shedding", duration: "1.5 hours", price: "$55" },
  ];

  // Available time slots
  const timeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"
  ];

  const handleBookingConfirm = () => {
    // In a real app, this would submit the booking to the backend
    alert(`Booking confirmed!\nService: ${selectedService}\nDate: ${selectedDate}\nTime: ${selectedTime}\nPet: ${petName}`);
    onClose();
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

                    <div className="mb-6 space-y-3 max-h-48 overflow-y-auto pr-2">
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

                    <div className="flex gap-3">
                      <button
                        onClick={() => setBookingStep("service")}
                        className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBookingConfirm}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                      >
                        Confirm Booking
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
