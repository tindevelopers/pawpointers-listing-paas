"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { type Listing, formatPrice } from "@/lib/listings";
import { ListingGallery } from "./ListingGallery";
import { LocationTabContent } from "./LocationTabContent";
import { AuthenticatedReviewForm } from "../reviews/AuthenticatedReviewForm";
import { BookingModal } from "./BookingModal";
import { ChatModal } from "./ChatModal";
import { ClaimListingModal } from "./ClaimListingModal";
import { createClient } from "@/core/database/client";

interface ListingDetailProps {
  listing: Listing;
}

type TabType = "overview" | "reviews" | "location" | "pricing" | "news";

type ClaimStatus = {
  canClaim: boolean;
  isOwner: boolean;
  isMember: boolean;
  activeClaim: { id: string; status: string } | null;
};

export function ListingDetail({ listing }: ListingDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClaimStatusLoading, setIsClaimStatusLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const isUnclaimed = listing.isUnclaimed ?? false;
  const featureAccess = listing.featureAccess;
  const canBook = featureAccess?.canBook ?? !isUnclaimed;
  const canMessageOwner = featureAccess?.canMessageOwner ?? !isUnclaimed;
  const canShowPricing = featureAccess?.canShowPricing ?? !isUnclaimed;
  const canShowAvailability = featureAccess?.canShowAvailability ?? !isUnclaimed;
  const canShowReviews = featureAccess?.canShowReviews ?? !isUnclaimed;
  const canShowPhone = featureAccess?.canShowPhone ?? !isUnclaimed;
  const canShowEmail = featureAccess?.canShowEmail ?? !isUnclaimed;
  const canShowWebsite = featureAccess?.canShowWebsite ?? !isUnclaimed;
  const claimFlowHref = `/pricing?intent=claim&listingId=${encodeURIComponent(listing.id)}&listingSlug=${encodeURIComponent(listing.slug)}`;

  const loadClaimStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setClaimStatus(null);
      return;
    }

    setIsClaimStatusLoading(true);
    try {
      const response = await fetch(
        `/api/listing-claims/status?listingId=${encodeURIComponent(listing.id)}`
      );
      const result = await response.json();
      if (response.ok && result?.success) {
        setClaimStatus(result.data as ClaimStatus);
      } else {
        setClaimStatus(null);
      }
    } catch {
      setClaimStatus(null);
    } finally {
      setIsClaimStatusLoading(false);
    }
  }, [isLoggedIn, listing.id]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    loadClaimStatus();
  }, [loadClaimStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("claim");
    setInviteToken(token);
  }, []);

  useEffect(() => {
    if (isLoggedIn && claimStatus?.canClaim && inviteToken) {
      setIsClaimModalOpen(true);
    }
  }, [isLoggedIn, claimStatus?.canClaim, inviteToken]);

  // Open booking modal when navigated with #book (e.g. from listing card "Book Now")
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (canBook && window.location.hash === "#book") {
      setIsBookingModalOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [canBook]);

  // Generate consistent mock data based on listing ID
  const idHash = listing.id.charCodeAt(0) + listing.id.charCodeAt(listing.id.length - 1);
  const rating = 3.5 + ((idHash % 20) / 10);
  const reviewCount = 10 + ((idHash * 7) % 150);

  // Fallback mock data for contact info and services if not provided
  const mockPhoneNumbers = ["(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890", "(555) 567-8901"];
  const mockEmails = ["contact@pawpointers.local", "info@pawpointers.local", "hello@pawpointers.local", "support@pawpointers.local"];
  const mockWebsites = ["pawpointers.local", "services.pawpointers.local", "bookings.pawpointers.local"];

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

  const phone =
    canShowPhone && !isUnclaimed
      ? listing.phone || mockPhoneNumbers[idHash % mockPhoneNumbers.length]
      : undefined;
  const email =
    canShowEmail && !isUnclaimed
      ? listing.email || mockEmails[idHash % mockEmails.length]
      : undefined;
  const website =
    canShowWebsite && !isUnclaimed
      ? listing.website || mockWebsites[idHash % mockWebsites.length]
      : undefined;
  const services =
    !isUnclaimed && featureAccess?.canShowFullDescription !== false
      ? listing.services || mockServicesByCategory[listing.category || ""] || ["Pet Services", "Professional Care"]
      : [];

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

  // Mock news data
  const mockNews = [
    {
      id: 1,
      title: "New Advanced Training Program Launched",
      date: "3 days ago",
      excerpt: "We're excited to announce the launch of our new advanced training program designed for professional handlers and enthusiasts.",
      content: "Our team has spent months developing a comprehensive curriculum that covers advanced techniques, behavioral psychology, and personalized training methods.",
      category: "Programs",
    },
    {
      id: 2,
      title: "Summer Special: 20% Off All Services",
      date: "1 week ago",
      excerpt: "This summer, we're offering 20% off all services to help you and your pet enjoy the season.",
      content: "Take advantage of our seasonal promotion to try our premium services at an unbeatable price. Limited time offer!",
      category: "Promotions",
    },
    {
      id: 3,
      title: "Meet Our New Team Member - Dr. Olivia Chen",
      date: "2 weeks ago",
      excerpt: "We're thrilled to welcome Dr. Olivia Chen to our growing team of pet care professionals.",
      content: "Dr. Chen brings 8 years of experience in veterinary medicine and pet behavior training. She specializes in behavior modification and wellness coaching.",
      category: "Team",
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
    ...(canShowReviews ? [{ id: "reviews" as TabType, label: "Reviews" }] : []),
    { id: "location", label: "Location" },
    ...(canShowPricing ? [{ id: "pricing" as TabType, label: "Pricing" }] : []),
    ...(!isUnclaimed ? [{ id: "news" as TabType, label: "News" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Name and Rating */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {/* Logo Placeholder - For Claimed Listings Only */}
            {!isUnclaimed && (
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {listing.title}
              </h1>

            <div className="flex items-center gap-4">
              {canShowReviews ? (
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
              ) : null}

              {/* Category Badge */}
              {listing.category && (
                <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-bold px-3 py-1.5 rounded-full">
                  {listing.category}
                </span>
              )}
            </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col gap-2 md:flex-row md:gap-3">
            {isUnclaimed ? (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = claimFlowHref;
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Claim Your Business
              </button>
            ) : (
              <>
                {canBook ? (
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Book Now
                  </button>
                ) : null}
                {canMessageOwner ? (
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(true)}
                    className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                ) : null}
              </>
            )}
            {listing.isUnclaimed && (!isLoggedIn || (!isClaimStatusLoading && claimStatus?.canClaim)) ? (
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 px-6 rounded-lg transition-all duration-200"
              >
                Submit claim directly
              </button>
            ) : null}
            {isLoggedIn && claimStatus?.activeClaim ? (
              <span className="inline-flex items-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                Claim status: {claimStatus.activeClaim.status}
              </span>
            ) : null}
          </div>
        </div>

        {/* Contact Info - Single Line with Icons */}
        <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-300 text-sm">
          {listing.location && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${phone}`} className="hover:text-orange-500 transition-colors">
                {phone}
              </a>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href={`mailto:${email}`} className="hover:text-orange-500 transition-colors">
                {email}
              </a>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                {website}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="mb-8">
        <ListingGallery
          images={isUnclaimed ? listing.images.slice(0, 1) : listing.images}
          title={listing.title}
        />
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {listing.description}
                </p>

                {!isUnclaimed && services && services.length > 0 ? (
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
                ) : null}

                {!isUnclaimed ? (
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
                      <p className="font-bold text-gray-900 dark:text-white">{services.length} types</p>
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
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = claimFlowHref;
                      }
                    }}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    Claim this business
                  </button>
                )}
              </div>

              {!isUnclaimed && canShowAvailability ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Hours of Operation</h2>
                  <div className="space-y-2">
                    {[
                      { day: "Monday", hours: "9:00 AM - 6:00 PM", isOpen: true },
                      { day: "Tuesday", hours: "9:00 AM - 6:00 PM", isOpen: true },
                      { day: "Wednesday", hours: "9:00 AM - 6:00 PM", isOpen: true },
                      { day: "Thursday", hours: "9:00 AM - 6:00 PM", isOpen: true },
                      { day: "Friday", hours: "9:00 AM - 6:00 PM", isOpen: true },
                      { day: "Saturday", hours: "10:00 AM - 4:00 PM", isOpen: true },
                      { day: "Sunday", hours: "Closed", isOpen: false },
                    ].map((schedule) => (
                      <div
                        key={schedule.day}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                          schedule.isOpen
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        <span className={`font-semibold ${
                          schedule.isOpen
                            ? "text-green-700 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {schedule.day}
                        </span>
                        <span className={`text-sm font-medium ${
                          schedule.isOpen
                            ? "text-green-700 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {schedule.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && canShowReviews && (
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

              {/* Review Form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Write a Review</h3>
                <AuthenticatedReviewForm 
                  entityId={listing.id}
                  listingId={listing.id}
                  onSubmit={async (reviewId) => {
                    console.log('[ListingDetail] Review submitted:', reviewId);
                    // Show success message and refresh reviews after a short delay
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  }}
                />
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === "location" && <LocationTabContent listing={listing} />}

          {/* Pricing Tab */}
          {activeTab === "pricing" && canShowPricing && (
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

          {/* News Tab */}
          {activeTab === "news" && !isUnclaimed && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Latest News</h2>
                <div className="space-y-6">
                  {mockNews.map((newsItem) => (
                    <div
                      key={newsItem.id}
                      className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-2.5 py-1 rounded-full">
                              {newsItem.category}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{newsItem.date}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {newsItem.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {newsItem.content}
                      </p>
                      <button className="mt-3 text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 font-semibold text-sm transition-colors">
                        Read More →
                      </button>
                    </div>
                  ))}
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
              {isUnclaimed ? (
                <>
                  <h3 className="text-xl font-bold mb-2">Own this business?</h3>
                  <p className="text-orange-100 text-sm mb-4">
                    Claim this free listing to unlock your profile, bookings, and customer tools.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = claimFlowHref;
                      }
                    }}
                    className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-all duration-200 mb-3"
                  >
                    Claim Your Business
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-2">Ready to book?</h3>
                  <p className="text-orange-100 text-sm mb-4">
                    Secure your service with this trusted provider
                  </p>
                  {canBook ? (
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(true)}
                      className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-all duration-200 mb-3 flex items-center justify-center gap-2 hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Book Now
                    </button>
                  ) : null}
                  {canMessageOwner ? (
                    <button
                      type="button"
                      onClick={() => setIsChatModalOpen(true)}
                      className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border-2 border-white/50 hover:border-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message Provider
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {/* Verification Badges - Only for claimed listings */}
            {!isUnclaimed && (
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
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {!isUnclaimed && canBook ? (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          listingId={listing.id}
          listingTitle={listing.title}
          isLoggedIn={isLoggedIn}
        />
      ) : null}

      {/* Chat Modal */}
      {!isUnclaimed && canMessageOwner ? (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          providerName={listing.title}
          providerImage={listing.images?.[0]}
        />
      ) : null}

      <ClaimListingModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
        inviteToken={inviteToken}
        isLoggedIn={isLoggedIn}
        onSuccess={async () => {
          await loadClaimStatus();
        }}
      />
    </div>
  );
}

export default ListingDetail;
