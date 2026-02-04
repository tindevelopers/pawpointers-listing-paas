"use client";

import { useState } from "react";
import { type Listing, formatPrice } from "@/lib/listings";
import { ListingGallery } from "./ListingGallery";
import { ListingMap } from "./ListingMap";

interface ListingDetailProps {
  listing: Listing;
}

type TabType = "overview" | "reviews" | "location" | "pricing";

export function ListingDetail({ listing }: ListingDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Generate consistent mock data based on listing ID
  const idHash = listing.id.charCodeAt(0) + listing.id.charCodeAt(listing.id.length - 1);
  const rating = 3.5 + ((idHash % 20) / 10);
  const reviewCount = 10 + ((idHash * 7) % 150);

  // Fallback mock data for phone and services if not provided
  const mockPhoneNumbers = ["(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890", "(555) 567-8901"];
  const mockServicesByCategory: Record<string, string[]> = {
    "pet-care-services": ["Dog Walking", "Pet Sitting", "Daycare"],
    "health-wellness": ["Veterinary Care", "Vaccinations", "Wellness Exams"],
    "training-behavior": ["Dog Training", "Behavior Consulting", "Obedience Classes"],
    "pet-grooming": ["Full Grooming", "Bath & Wash", "Nail Trimming"],
    "pet-retail": ["Pet Supplies", "Toys & Accessories", "Pet Food"],
    "specialist-services": ["Pet Photography", "Pet Transportation", "Training Facility"],
    "rescue-community": ["Rescue Services", "Adoption Services", "Foster Network"],
    "events-experiences": ["Pet Classes", "Workshops", "Social Events"],
  };

  const phone = listing.phone || mockPhoneNumbers[idHash % mockPhoneNumbers.length];
  const services = listing.services || mockServicesByCategory[listing.category || ""] || ["Pet Services", "Professional Care"];

  // Mock reviews data
  const mockReviews = [
    {
      id: 1,
      author: "Sarah M.",
      rating: 5,
      date: "2 weeks ago",
      text: "Absolutely amazing service! The team was professional, punctual, and thorough. My pet came back so happy and clean. Highly recommend!",
      verified: true,
    },
    {
      id: 2,
      author: "John D.",
      rating: 5,
      date: "1 month ago",
      text: "Best experience ever. They really care about the animals and it shows. Will definitely be coming back!",
      verified: true,
    },
    {
      id: 3,
      author: "Emma W.",
      rating: 4,
      date: "2 months ago",
      text: "Great service overall. Very pleased with the results. Maybe a bit pricey but worth it.",
      verified: true,
    },
  ];

  const renderStars = (rate: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rate)
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600"
        }`}
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ));
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "reviews", label: "Reviews" },
    { id: "location", label: "Location" },
    { id: "pricing", label: "Pricing" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Name and Rating */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {listing.title}
            </h1>
            
            {/* Rating Badge */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {renderStars(rating)}
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({reviewCount} reviews)
                </span>
              </div>
              
              {/* Category Badge */}
              {listing.category && (
                <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-bold px-3 py-1.5 rounded-full">
                  {listing.category}
                </span>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col gap-2 md:flex-row md:gap-3">
            <button
              type="button"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Book Now
            </button>
            <button
              type="button"
              className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
          </div>
        </div>

        {/* Location and Contact Info */}
        <div className="flex flex-col gap-3">
          {listing.location && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>
                {[
                  listing.location.address,
                  listing.location.city,
                  listing.location.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${phone}`} className="hover:text-orange-500 transition-colors">
                {phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="mb-8">
        <ListingGallery images={listing.images} title={listing.title} />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Quick Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {listing.description}
                </p>

                {/* Services Provided */}
                {services && services.length > 0 && (
                  <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Services Provided</h3>
                    <div className="flex flex-wrap gap-2">
                      {services.map((service) => (
                        <span
                          key={service}
                          className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium px-3 py-1.5 rounded-full"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Facts Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg mx-auto mb-2">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Response Time</p>
                    <p className="font-bold text-gray-900 dark:text-white">Usually 1h</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mx-auto mb-2">
                      <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Services</p>
                    <p className="font-bold text-gray-900 dark:text-white">12 types</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Since</p>
                    <p className="font-bold text-gray-900 dark:text-white">Jan 2023</p>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Availability</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => (
                    <div
                      key={day}
                      className={`p-3 rounded-lg text-center font-medium transition-colors ${
                        idx < 5
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <strong>Hours:</strong> 9:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Reviews Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Guest Reviews</h2>

                {/* Rating Summary */}
                <div className="flex flex-col md:flex-row gap-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                      {rating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(rating)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Based on {reviewCount} reviews
                    </p>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const percentage = Math.floor((Math.random() * 40) + 20);
                      return (
                        <div key={stars} className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-1 min-w-max">
                            {Array.from({ length: stars }).map((_, i) => (
                              <svg
                                key={i}
                                className="w-4 h-4 fill-yellow-400 text-yellow-400"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-max">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {review.author}
                          {review.verified && (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      {review.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === "location" && (
            <div>
              {listing.location?.lat && listing.location?.lng && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>
                  <ListingMap
                    lat={listing.location.lat}
                    lng={listing.location.lng}
                    title={listing.title}
                  />
                  {listing.location && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {[
                          listing.location.address,
                          listing.location.city,
                          listing.location.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Basic Tier */}
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-orange-400 dark:hover:border-orange-600 transition-colors cursor-pointer">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Basic</h3>
                  <div className="text-2xl font-bold text-orange-500 mb-4">
                    {formatPrice(listing.price ?? 0)}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      Standard service
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      30-minute session
                    </li>
                  </ul>
                </div>

                {/* Professional Tier */}
                <div className="border-2 border-orange-400 dark:border-orange-600 rounded-xl p-4 relative bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-900/10 dark:to-transparent">
                  <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 mt-2">Professional</h3>
                  <div className="text-2xl font-bold text-orange-500 mb-4">
                    {formatPrice(Math.round((listing.price ?? 0) * 1.5))}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      Enhanced service
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      60-minute session
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      Priority support
                    </li>
                  </ul>
                </div>

                {/* Premium Tier */}
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors cursor-pointer">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Premium</h3>
                  <div className="text-2xl font-bold text-accent-secondary mb-4">
                    {formatPrice(Math.round((listing.price ?? 0) * 2.5))}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      Full service
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      120-minute session
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      24/7 support
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Always Visible CTA */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            {/* Main CTA Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl shadow-lg p-6 text-white mb-4">
              <h3 className="text-xl font-bold mb-2">Ready to book?</h3>
              <p className="text-orange-100 text-sm mb-4">
                Secure your service with this trusted provider
              </p>

              <button
                type="button"
                className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-all duration-200 mb-3 flex items-center justify-center gap-2 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Book Now
              </button>

              <button
                type="button"
                className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 border-white/50 hover:border-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message Provider
              </button>
            </div>

            {/* Verification Badges */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Verified Badges</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg text-xs">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  <span className="font-semibold text-green-700 dark:text-green-300">Identity Verified</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg text-xs">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">Background Check</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetail;
