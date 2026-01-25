"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { 
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { useAvailability, AvailabilitySlot } from "@listing-platform/booking/client";
import Link from "next/link";

export default function AvailabilityCalendarPage() {
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [bookingProvider, setBookingProvider] = useState<"builtin" | "gohighlevel" | "calcom">("builtin");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Mock listing IDs - replace with actual API call
  const listings = [
    { id: "listing-1", name: "Beachfront Villa" },
    { id: "listing-2", name: "Mountain Cabin" },
    { id: "listing-3", name: "City Apartment" },
  ];

  // Get current month dates for calendar
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  
  // Previous month days
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth, i),
      isCurrentMonth: true,
    });
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth + 1, i),
      isCurrentMonth: false,
    });
  }

  // Mock availability data - replace with actual API call
  const mockAvailability: Record<string, AvailabilitySlot> = {
    "2025-01-20": {
      id: "slot-1",
      listingId: "listing-1",
      tenantId: "tenant-1",
      date: "2025-01-20",
      available: true,
      maxBookings: 1,
      currentBookings: 0,
      price: 200,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    },
    "2025-01-21": {
      id: "slot-2",
      listingId: "listing-1",
      tenantId: "tenant-1",
      date: "2025-01-21",
      available: true,
      maxBookings: 1,
      currentBookings: 0,
      price: 200,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    },
    "2025-01-22": {
      id: "slot-3",
      listingId: "listing-1",
      tenantId: "tenant-1",
      date: "2025-01-22",
      available: false,
      maxBookings: 1,
      currentBookings: 1,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    },
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getAvailabilityStatus = (date: Date) => {
    const dateStr = formatDate(date);
    const slot = mockAvailability[dateStr];
    if (!slot) return "unknown";
    if (!slot.available) return "unavailable";
    if (slot.currentBookings >= slot.maxBookings) return "full";
    return "available";
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-500";
      case "unavailable":
        return "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-500";
      case "full":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-500";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleDateClick = (date: Date) => {
    if (selectedListingId) {
      setSelectedDate(formatDate(date));
      setShowAddSlotModal(true);
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <PageBreadcrumb pageTitle="Availability Calendar" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/bookings">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                Availability Calendar
              </h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Manage availability and pricing for your listings
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddSlotModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Availability Slot
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Listing
              </label>
              <select
                value={selectedListingId}
                onChange={(e) => setSelectedListingId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Listings</option>
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Booking Provider
              </label>
              <select
                value={bookingProvider}
                onChange={(e) => setBookingProvider(e.target.value as any)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="builtin">Built-in</option>
                <option value="gohighlevel">GoHighLevel</option>
                <option value="calcom">Cal.com</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                View Mode
              </label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "month" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === "week" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const status = getAvailabilityStatus(day.date);
              const isToday =
                day.date.toDateString() === new Date().toDateString();
              const slot = mockAvailability[formatDate(day.date)];

              return (
                <button
                  key={idx}
                  onClick={() => handleDateClick(day.date)}
                  disabled={!selectedListingId}
                  className={`
                    relative rounded-lg border p-2 text-left transition-colors
                    ${day.isCurrentMonth ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600"}
                    ${isToday ? "ring-2 ring-blue-500" : ""}
                    ${selectedListingId ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : "cursor-not-allowed opacity-50"}
                    ${getAvailabilityColor(status)}
                    ${!day.isCurrentMonth ? "opacity-50" : ""}
                  `}
                >
                  <div className="text-sm font-medium">
                    {day.date.getDate()}
                  </div>
                  {slot && (
                    <div className="mt-1 text-xs">
                      {slot.price && (
                        <div className="font-semibold">
                          ${slot.price}
                        </div>
                      )}
                      {slot.currentBookings > 0 && (
                        <div className="text-xs opacity-75">
                          {slot.currentBookings}/{slot.maxBookings}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-500/15"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-yellow-100 dark:bg-yellow-500/15"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-500/15"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Not Set</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Availability Slot Modal */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Add Availability Slot
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Listing
                </label>
                <select
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select a listing</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price (optional)
                </label>
                <input
                  type="number"
                  placeholder="200.00"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="available" className="text-sm text-gray-700 dark:text-gray-300">
                  Available
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddSlotModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Handle save - in real app, call API
                setShowAddSlotModal(false);
              }}>
                Save Slot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

