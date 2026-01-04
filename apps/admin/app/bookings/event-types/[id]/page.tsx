"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface EventType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency: string;
  bookingType: "location" | "meeting" | "hybrid";
  videoProvider: "none" | "zoom" | "microsoft_teams";
  bufferBefore: number;
  bufferAfter: number;
  requiresConfirmation: boolean;
  requiresPayment: boolean;
  instantBooking: boolean;
  active: boolean;
}

export default function EventTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [formData, setFormData] = useState<Partial<EventType>>({});

  useEffect(() => {
    if (params.id) {
      loadEventType(params.id as string);
    }
  }, [params.id]);

  const loadEventType = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking/event-types/${id}`);
      if (!response.ok) throw new Error("Failed to load event type");
      const data = await response.json();
      setEventType(data.eventType);
      setFormData(data.eventType);
    } catch (error) {
      console.error("Error loading event type:", error);
      alert("Failed to load event type");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/booking/event-types/${eventType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update event type");
      }

      await loadEventType(eventType.id);
      alert("Event type updated successfully");
    } catch (error: any) {
      alert(error.message || "Failed to update event type");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Event Type" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!eventType) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Event Type" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">Event type not found</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={eventType.name} />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/bookings/event-types">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
            {eventType.name}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow dark:bg-gray-900 p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Booking Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Booking Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Booking Type *
                  </label>
                  <select
                    value={formData.bookingType || "location"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bookingType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="location">Location</option>
                    <option value="meeting">Meeting</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.durationMinutes || 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <select
                      value={formData.currency || "USD"}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video Provider
                  </label>
                  <select
                    value={formData.videoProvider || "none"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        videoProvider: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="none">None</option>
                    <option value="zoom">Zoom</option>
                    <option value="microsoft_teams">Microsoft Teams</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Buffer Times */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Buffer Times
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buffer Before (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bufferBefore || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferBefore: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buffer After (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bufferAfter || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferAfter: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Options
              </h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requiresConfirmation ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresConfirmation: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Requires confirmation
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requiresPayment ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresPayment: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Requires payment
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.instantBooking ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instantBooking: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Allow instant booking
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        active: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/bookings/event-types">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


