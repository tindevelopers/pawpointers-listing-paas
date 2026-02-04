"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * SearchBar - Enhanced search component for service listings
 *
 * Features:
 * - Service type selector
 * - Location-based search
 * - Date/time picker for service bookings
 * - Advanced filters button
 */

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  showFiltersButton?: boolean;
  onFiltersClick?: () => void;
}

export function SearchBar({
  placeholder = "Search services, professions, or providers...",
  className = "",
  showFiltersButton = true,
  onFiltersClick,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [serviceType, setServiceType] = useState(searchParams.get("type") || "all");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || "");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const params = new URLSearchParams(searchParams.toString());

      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }

      if (serviceType && serviceType !== "all") {
        params.set("type", serviceType);
      } else {
        params.delete("type");
      }

      if (selectedDate) {
        params.set("date", selectedDate);
      } else {
        params.delete("date");
      }

      params.delete("page"); // Reset pagination on new search

      router.push(`/search?${params.toString()}`);
    },
    [query, serviceType, selectedDate, router, searchParams]
  );

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      {/* Main search row */}
      <div className="flex gap-2">
        {/* Service Type Selector */}
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
        >
          <option value="all">All Services</option>
          <option value="pet-care-services">Pet Care Services</option>
          <option value="health-wellness">Health and Wellness</option>
          <option value="training-behavior">Training and Behavior</option>
          <option value="pet-retail">Pet Retail</option>
          <option value="specialist-services">Specialist Pet Services</option>
          <option value="rescue-community">Rescue & Community</option>
          <option value="events-experiences">Events & Experiences</option>
        </select>

        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all duration-200 hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>

        {/* Filters Button */}
        {showFiltersButton && (
          <button
            type="button"
            onClick={onFiltersClick}
            className="px-4 py-3 border-2 border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-lg transition-all font-semibold flex items-center gap-2 hover:border-orange-400"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="hidden sm:inline">More Filters</span>
          </button>
        )}
      </div>

      {/* Secondary filters row - Date/Time picker */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-0 outline-none text-gray-900 dark:text-white font-medium cursor-pointer"
          />
        </label>

        {/* Near Me Button */}
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          <svg className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden sm:inline">Near Me</span>
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
