"use client";

import { useState, useEffect, useCallback } from "react";
import { type Listing, formatPrice } from "@/lib/listings";
import { ListingGallery } from "./ListingGallery";
import { LocationTabContent } from "./LocationTabContent";
import { AuthenticatedReviewForm } from "../reviews/AuthenticatedReviewForm";
import { BookingModal } from "./BookingModal";
import { ChatModal } from "./ChatModal";
import { ClaimListingModal } from "./ClaimListingModal";
import { createClient } from "@/core/database/client";
import { ReviewsList, useReviewStats } from "@listing-platform/reviews";

interface ListingDetailProps {
  listing: Listing;
}

type TabType = "overview" | "reviews" | "location" | "pricing";
type ReviewsViewTab = "aggregated" | "verified" | "google" | "yelp";

type ClaimStatus = {
  canClaim: boolean;
  isOwner: boolean;
  isMember: boolean;
  activeClaim: { id: string; status: string } | null;
};

export function ListingDetail({ listing }: ListingDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [activeReviewsView, setActiveReviewsView] = useState<ReviewsViewTab>("aggregated");
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

  // Review stats (first-party + external + weighted headline)
  const { stats: reviewStats } = useReviewStats(listing.id);

  const rating =
    reviewStats?.headline?.score ?? reviewStats?.averageRating ?? listing.ratingAverage;
  const reviewCount =
    reviewStats?.total ?? listing.ratingCount;
  const safeReviewCount = typeof reviewCount === "number" ? reviewCount : 0;
  const safeRating = typeof rating === "number" ? rating : 0;

  const shouldShowRating =
    canShowReviews &&
    typeof rating === "number" &&
    typeof reviewCount === "number" &&
    reviewCount > 0;

  const contact = listing.contact || {};
  const phone =
    canShowPhone && !isUnclaimed ? contact.phone || listing.phone : undefined;
  const email =
    canShowEmail && !isUnclaimed ? contact.email || listing.email : undefined;
  const website =
    canShowWebsite && !isUnclaimed ? contact.website || listing.website : undefined;
  const bookingUrl = !isUnclaimed ? contact.bookingUrl : undefined;
  const whatsappUrl = !isUnclaimed ? contact.whatsappUrl : undefined;
  const websiteHref =
    website && (website.startsWith("http://") || website.startsWith("https://"))
      ? website
      : website
        ? `https://${website}`
        : undefined;

  const serviceItems = !isUnclaimed ? listing.serviceItems ?? [] : [];
  const services =
    !isUnclaimed && featureAccess?.canShowFullDescription !== false
      ? (listing.services?.length ? listing.services : serviceItems.map((service) => service.name))
          .filter(Boolean)
      : [];
  const packages = !isUnclaimed ? listing.packages ?? [] : [];
  const providerProfile = !isUnclaimed ? listing.providerProfile : undefined;
  const hasProviderProfile =
    !!providerProfile &&
    !!(
      providerProfile.businessName ||
      providerProfile.ownerName ||
      providerProfile.yearsExperience ||
      providerProfile.licenseNumber ||
      providerProfile.insured ||
      (providerProfile.certifications && providerProfile.certifications.length > 0)
    );
  const providerCertifications = providerProfile?.certifications ?? [];
  const features = !isUnclaimed ? listing.features : undefined;
  const social = !isUnclaimed ? listing.social : undefined;
  const hours = !isUnclaimed ? listing.hours : undefined;

  const dayLabels = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
  ] as const;

  const hoursEntries = hours
    ? dayLabels
        .map((day) => {
          const dayHours = (hours as any)?.[day.key];
          if (!dayHours || typeof dayHours.open !== "boolean") return null;
          const openTime = dayHours.openTime || "";
          const closeTime = dayHours.closeTime || "";
          return {
            day: day.label,
            open: dayHours.open,
            hours: dayHours.open ? [openTime, closeTime].filter(Boolean).join(" - ") : "Closed",
          };
        })
        .filter(Boolean)
    : [];

  const hasHours = hoursEntries.length > 0;

  const featureLabels = [
    { key: "parking", label: "Parking available" },
    { key: "petFriendly", label: "Pet-friendly" },
    { key: "mobileService", label: "Mobile service" },
    { key: "organicProducts", label: "Organic products" },
    { key: "certifiedGroomers", label: "Certified groomers" },
    { key: "pickupDropoff", label: "Pickup/dropoff" },
    { key: "spaServices", label: "Spa services" },
    { key: "ecoFriendly", label: "Eco-friendly" },
  ];
  const featureList = [
    ...featureLabels
      .filter((item) => (features as any)?.[item.key])
      .map((item) => item.label),
    ...(((features as any)?.custom as string[]) || []),
  ].filter(Boolean);
  const hasFeatures = featureList.length > 0;

  const socialLinks = [
    { label: "Instagram", url: social?.instagram },
    { label: "Facebook", url: social?.facebook },
    { label: "TikTok", url: social?.tiktok },
    { label: "LinkedIn", url: social?.linkedin },
    { label: "YouTube", url: social?.youtube },
    { label: "X", url: social?.x },
  ].filter((link) => !!link.url);

  const hasSocialLinks = socialLinks.length > 0;
  const hasPricingData =
    !!listing.price || serviceItems.length > 0 || packages.length > 0;

  const hasGoogle = (reviewStats?.bySourceType?.google_maps?.total || 0) > 0;
  const hasYelp = (reviewStats?.bySourceType?.yelp?.total || 0) > 0;

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
    ...(canShowPricing && hasPricingData ? [{ id: "pricing" as TabType, label: "Pricing" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Name and Rating */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {!isUnclaimed ? (
              <div className="flex-shrink-0">
                {providerProfile?.logoUrl ? (
                  <img
                    src={providerProfile.logoUrl}
                    alt={`${listing.title} logo`}
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            ) : null}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {listing.title}
              </h1>
              {listing.tagline && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {listing.tagline}
                </p>
              )}

            <div className="flex items-center gap-4">
              {shouldShowRating ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(rating as number)}
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(rating as number).toFixed(1)}
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
          {website && websiteHref && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                {website}
              </a>
            </div>
          )}
          {!isUnclaimed && bookingUrl && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-13 9h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                Booking
              </a>
            </div>
          )}
          {!isUnclaimed && whatsappUrl && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">
                WhatsApp
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

                {hasProviderProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {providerProfile?.businessName && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500">Business Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {providerProfile.businessName}
                        </p>
                      </div>
                    )}
                    {providerProfile?.ownerName && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500">Owner / Provider</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {providerProfile.ownerName}
                        </p>
                      </div>
                    )}
                    {typeof providerProfile?.yearsExperience === "number" && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500">Experience</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {providerProfile.yearsExperience} years
                        </p>
                      </div>
                    )}
                    {providerProfile?.licenseNumber && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500">License</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {providerProfile.licenseNumber}
                        </p>
                      </div>
                    )}
                    {providerProfile?.insured !== undefined && (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500">Insurance</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {providerProfile.insured ? "Insured" : "Not insured"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {providerCertifications.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Certifications
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {providerCertifications.map((cert) => (
                        <span
                          key={cert}
                          className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isUnclaimed ? (
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
                ) : null}
              </div>

              {!isUnclaimed && canShowAvailability && hasHours ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Hours of Operation</h2>
                  <div className="space-y-2">
                    {hoursEntries.map((schedule) => (
                      <div
                        key={schedule.day}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                          schedule.open
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        <span className={`font-semibold ${
                          schedule.open
                            ? "text-green-700 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {schedule.day}
                        </span>
                        <span className={`text-sm font-medium ${
                          schedule.open
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

              {!isUnclaimed && hasFeatures ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {featureList.map((feature) => (
                      <span
                        key={feature}
                        className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium px-3 py-1.5 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isUnclaimed && hasSocialLinks ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Social Links</h2>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-orange-400 hover:text-orange-600"
                      >
                        {link.label}
                      </a>
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

                {/* Rating Summary (trust-weighted headline) */}
                <div className="flex flex-col md:flex-row gap-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center justify-center">
                    {shouldShowRating ? (
                      <>
                        <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                          {safeRating.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {renderStars(safeRating)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Based on {safeReviewCount} reviews
                        </p>
                        {reviewStats?.headline ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            PawPointers weight: {(reviewStats.headline.pawpointersWeight * 100).toFixed(0)}%
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No reviews yet.
                      </p>
                    )}
                  </div>

                  {/* Rating Breakdown (simple; full distribution is available via /api/reviews/stats) */}
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const dist = reviewStats?.ratingDistribution as any;
                      const countForStars = dist?.[stars] || 0;
                      const percentage =
                        safeReviewCount > 0 ? Math.round((countForStars / safeReviewCount) * 100) : 0;
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

              {/* Source tabs */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "aggregated" as const, label: "Aggregated" },
                  { id: "verified" as const, label: "Verified" },
                  { id: "google" as const, label: "Google", hidden: !hasGoogle },
                  { id: "yelp" as const, label: "Yelp", hidden: !hasYelp },
                ]).filter((t) => !t.hidden).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveReviewsView(t.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      activeReviewsView === t.id
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Reviews feed */}
              <div className="space-y-4">
                <ReviewsList
                  entityId={listing.id}
                  filters={
                    activeReviewsView === "verified"
                      ? { source: "first_party", verifiedOnly: true, sortOrder: "desc", limit: 10 }
                      : activeReviewsView === "google"
                        ? { source: "dataforseo", sourceType: "google_maps", sortOrder: "desc", limit: 10 }
                        : activeReviewsView === "yelp"
                          ? { source: "all", sourceType: "yelp", sortOrder: "desc", limit: 10 }
                          : { source: "all", sortOrder: "desc", limit: 10 }
                  }
                />
              </div>

              {/* Review Form */}
              {activeReviewsView === "aggregated" || activeReviewsView === "verified" ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Write a Review</h3>
                  <AuthenticatedReviewForm 
                    entityId={listing.id}
                    listingId={listing.id}
                    onSubmit={async () => {
                      // Refresh stats + list (simple approach for now)
                      setTimeout(() => window.location.reload(), 1200);
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Location Tab */}
          {activeTab === "location" && <LocationTabContent listing={listing} />}

          {/* Pricing Tab */}
          {activeTab === "pricing" && canShowPricing && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Pricing</h2>
              <div className="space-y-6">
                {packages.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Packages</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {packages.map((pkg) => (
                        <div key={pkg.name} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{pkg.name}</h4>
                            {typeof pkg.price === "number" ? (
                              <span className="text-sm font-semibold text-orange-500">
                                {formatPrice(pkg.price)}
                              </span>
                            ) : null}
                          </div>
                          {pkg.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {pkg.description}
                            </p>
                          )}
                          {pkg.includedServiceNames && pkg.includedServiceNames.length > 0 && (
                            <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
                              {pkg.includedServiceNames.map((service) => (
                                <li key={service}>{service}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {serviceItems.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Pricing</h3>
                    <div className="space-y-3">
                      {serviceItems.map((service) => (
                        <div key={service.name} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            {typeof service.price === "number" ? (
                              <span className="text-sm font-semibold text-orange-500">
                                {formatPrice(service.price)}
                              </span>
                            ) : null}
                          </div>
                          {typeof service.durationMinutes === "number" && (
                            <p className="mt-2 text-xs text-gray-500">
                              Duration: {service.durationMinutes} minutes
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!packages.length && !serviceItems.length && typeof listing.price === "number" && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500">Starting price</p>
                    <p className="text-2xl font-semibold text-orange-500">
                      {formatPrice(listing.price)}
                    </p>
                  </div>
                )}

                {!packages.length && !serviceItems.length && typeof listing.price !== "number" && (
                  <p className="text-sm text-gray-500">No pricing details available.</p>
                )}
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
