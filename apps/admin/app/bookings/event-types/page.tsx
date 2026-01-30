"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
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
  active: boolean;
  createdAt: string;
}

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/booking/event-types?activeOnly=false");
      if (!response.ok) throw new Error("Failed to load event types");
      const data = await response.json();
      setEventTypes(data.eventTypes || []);
    } catch (error) {
      console.error("Error loading event types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event type?")) {
      return;
    }

    try {
      const response = await fetch(`/api/booking/event-types/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event type");
      await loadEventTypes();
    } catch (error) {
      console.error("Error deleting event type:", error);
      alert("Failed to delete event type");
    }
  };

  const filteredEventTypes = eventTypes.filter((eventType) => {
    const matchesSearch =
      eventType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventType.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "all" || eventType.bookingType === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPrice = (price?: number, currency: string = "USD") => {
    if (!price) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getBookingTypeColor = (type: string) => {
    switch (type) {
      case "location":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-500";
      case "meeting":
        return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-500";
      case "hybrid":
        return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Event Types" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">Loading event types...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Event Types" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
              Event Types
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage different types of bookings and meetings
            </p>
          </div>
          <Link href="/bookings/event-types/new" className="self-start sm:self-auto">
            <Button>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event Type
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search event types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="location">Location</option>
            <option value="meeting">Meeting</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Event Types Table */}
        <div className="bg-white rounded-lg shadow dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredEventTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {eventTypes.length === 0
                        ? "No event types found. Create your first event type to get started."
                        : "No event types match your search criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredEventTypes.map((eventType) => (
                    <tr key={eventType.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {eventType.name}
                          </div>
                          {eventType.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {eventType.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getBookingTypeColor(eventType.bookingType)}`}
                        >
                          {eventType.bookingType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDuration(eventType.durationMinutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatPrice(eventType.price, eventType.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {eventType.videoProvider !== "none" ? (
                          <span className="capitalize">{eventType.videoProvider}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            eventType.active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {eventType.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link href={`/bookings/event-types/${eventType.id}`}>
                            <Button variant="outline" size="sm">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(eventType.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
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


