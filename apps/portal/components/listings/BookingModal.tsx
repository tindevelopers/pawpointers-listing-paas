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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
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
          <div className="p-6">
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
        </div>
      </div>
    </>
  );
}
