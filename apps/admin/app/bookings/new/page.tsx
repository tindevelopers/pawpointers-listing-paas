"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface EventType {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
  currency: string;
  bookingType: "location" | "meeting" | "hybrid";
  videoProvider: "none" | "zoom" | "microsoft_teams";
}

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [formData, setFormData] = useState({
    listingId: "",
    eventTypeId: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    guestCount: 1,
    specialRequests: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    videoProvider: "" as "" | "zoom" | "microsoft_teams",
    bookingProvider: "builtin" as "builtin" | "gohighlevel" | "calcom",
  });

  useEffect(() => {
    loadEventTypes();
  }, []);

  useEffect(() => {
    if (selectedEventType) {
      const eventType = eventTypes.find((et) => et.id === selectedEventType);
      if (eventType) {
        setFormData({
          ...formData,
          eventTypeId: selectedEventType,
          videoProvider:
            eventType.videoProvider !== "none"
              ? (eventType.videoProvider as "zoom" | "microsoft_teams")
              : "",
        });
      }
    }
  }, [selectedEventType]);

  const loadEventTypes = async () => {
    try {
      const response = await fetch("/api/booking/event-types?activeOnly=true");
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data.eventTypes || []);
      }
    } catch (error) {
      console.error("Error loading event types:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          video_provider: formData.videoProvider || undefined,
          provider: formData.bookingProvider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create booking");
      }

      const data = await response.json();
      router.push(`/bookings/${data.id}`);
    } catch (error: any) {
      alert(error.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const selectedEventTypeData = eventTypes.find(
    (et) => et.id === selectedEventType
  );

  return (
    <div>
      <PageBreadcrumb pageTitle="Create Booking" />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
            Create Booking
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow dark:bg-gray-900 p-6 space-y-6">
            {/* Booking Provider */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Booking Provider
              </h2>
              <select
                value={formData.bookingProvider}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bookingProvider: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="builtin">Built-in (local)</option>
                <option value="gohighlevel">GoHighLevel</option>
                <option value="calcom">Cal.com</option>
              </select>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Choose which provider should handle this booking. External providers will store the booking locally and can be synced via the API server.
              </p>
            </div>

            {/* Event Type Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Event Type
              </h2>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select an event type...</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType.id} value={eventType.id}>
                    {eventType.name} ({eventType.durationMinutes} min)
                    {eventType.price
                      ? ` - ${new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: eventType.currency,
                        }).format(eventType.price)}`
                      : " - Free"}
                  </option>
                ))}
              </select>
              {selectedEventTypeData && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    Type: {selectedEventTypeData.bookingType} | Duration:{" "}
                    {selectedEventTypeData.durationMinutes} minutes
                  </p>
                  {selectedEventTypeData.videoProvider !== "none" && (
                    <p className="text-purple-600 dark:text-purple-400">
                      Video: {selectedEventTypeData.videoProvider}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Date & Time
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) =>
                      setFormData({ ...formData, timezone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Guest Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Guest Count *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.guestCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        guestCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Requests
                </label>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specialRequests: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Video Provider (if event type supports it) */}
            {selectedEventTypeData &&
              selectedEventTypeData.videoProvider !== "none" && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Video Meeting
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Video Provider
                    </label>
                    <select
                      value={formData.videoProvider}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          videoProvider: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Use event type default</option>
                      <option value="zoom">Zoom</option>
                      <option value="microsoft_teams">Microsoft Teams</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      A video meeting will be automatically created when the booking
                      is confirmed.
                    </p>
                  </div>
                </div>
              )}
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/bookings">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !selectedEventType}>
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


