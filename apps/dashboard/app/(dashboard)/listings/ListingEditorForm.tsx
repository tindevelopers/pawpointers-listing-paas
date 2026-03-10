"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { LocationField } from "./LocationField";
import { DeleteListingButton } from "./DeleteListingButton";
import { updateListingDetails, deleteListing, type UpdateListingState } from "@/app/actions/listings";

const inputBase =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

type ListingEditorData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  status: string | null;
  price: number | null;
  currency: string | null;
  price_type: string | null;
  featured_image: string | null;
  video_url: string | null;
  address: Record<string, unknown> | null;
  custom_fields: Record<string, unknown> | null;
  booking_provider_id?: string | null;
};

type BookingProviderOption = { id: string; provider: string };

type ServiceInput = {
  name: string;
  price: string;
  currency: string;
  priceType: string;
  durationMinutes: string;
  description: string;
  featured: boolean;
};

type PackageInput = {
  name: string;
  price: string;
  currency: string;
  description: string;
  includedServiceNames: string;
};

const dayLabels: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function ListingEditorForm({
  listing,
  bookingProviders = [],
}: {
  listing: ListingEditorData;
  bookingProviders?: BookingProviderOption[];
}) {
  const customFields = (listing.custom_fields ?? {}) as Record<string, any>;
  const contact = customFields.contact || {};
  const provider = customFields.providerProfile || {};
  const serviceArea = customFields.serviceArea || {};
  const hours = customFields.hours || {};
  const features = customFields.features || {};
  const social = customFields.social || {};

  const initialServices: ServiceInput[] = Array.isArray(customFields.services)
    ? customFields.services.map((service: any) => ({
        name: service?.name ?? "",
        price: service?.price != null ? String(service.price) : "",
        currency: service?.currency ?? "",
        priceType: service?.priceType ?? "",
        durationMinutes: service?.durationMinutes != null ? String(service.durationMinutes) : "",
        description: service?.description ?? "",
        featured: service?.featured === true,
      }))
    : [];

  const initialPackages: PackageInput[] = Array.isArray(customFields.packages)
    ? customFields.packages.map((pkg: any) => ({
        name: pkg?.name ?? "",
        price: pkg?.price != null ? String(pkg.price) : "",
        currency: pkg?.currency ?? "",
        description: pkg?.description ?? "",
        includedServiceNames: Array.isArray(pkg?.includedServiceNames)
          ? pkg.includedServiceNames.join(", ")
          : "",
      }))
    : [];

  const [services, setServices] = useState<ServiceInput[]>(initialServices);
  const [packages, setPackages] = useState<PackageInput[]>(initialPackages);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<UpdateListingState, FormData>(
    updateListingDetails,
    { ok: true }
  );

  const servicesJson = useMemo(() => JSON.stringify(services), [services]);
  const packagesJson = useMemo(() => JSON.stringify(packages), [packages]);

  const handleServiceChange = (index: number, key: keyof ServiceInput, value: string | boolean) => {
    setServices((prev) =>
      prev.map((service, i) => (i === index ? { ...service, [key]: value } : service))
    );
  };

  const handlePackageChange = (index: number, key: keyof PackageInput, value: string) => {
    setPackages((prev) =>
      prev.map((pkg, i) => (i === index ? { ...pkg, [key]: value } : pkg))
    );
  };

  const addressDefault =
    listing.address && typeof listing.address === "object"
      ? [
          listing.address.street,
          listing.address.city,
          listing.address.region,
          listing.address.country,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

  return (
    <form
      id="listing-editor-form"
      action={formAction}
      className="space-y-10"
      onSubmit={() => {
        setClientErrors({});
        setClientMessage(null);
      }}
    >
      <input type="hidden" name="id" value={listing.id} />
      <input type="hidden" name="servicesJson" value={servicesJson} />
      <input type="hidden" name="packagesJson" value={packagesJson} />
      {/* Continue saves without changing status; redirectTo sends user to listing management */}
      <input type="hidden" name="status" value={listing.status || "draft"} />
      <input type="hidden" name="redirectTo" value="listings" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Edit Listing</h1>
          <p className="mt-1 text-sm text-gray-600">
            Update your public listing details and publish when ready.
          </p>
        </div>
        <Link href="/listings" className="text-sm font-medium text-orange-600 hover:text-orange-700">
          Back to listings
        </Link>
      </div>

      {(clientMessage || state.message) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {clientMessage || state.message}
        </div>
      )}

      {/* Basic Info */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Basic Info</h2>
          <p className="text-sm text-gray-600">Core listing details visible on the portal.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="title">
              Business / Listing Name
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={listing.title}
              className={inputBase}
              aria-invalid={!!(clientErrors.title || state.errors?.title)}
            />
            {(clientErrors.title || state.errors?.title) && (
              <p className="text-xs text-red-600">{clientErrors.title || state.errors?.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="slug">
              Slug (optional)
            </label>
            <input id="slug" name="slug" defaultValue={listing.slug} className={inputBase} />
            <p className="text-xs text-gray-500">Auto-generated if left blank.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="tagline">
              Tagline / Short blurb
            </label>
            <input
              id="tagline"
              name="tagline"
              maxLength={140}
              defaultValue={customFields.tagline ?? listing.excerpt ?? ""}
              className={inputBase}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="description">
              Long Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={listing.description ?? ""}
              className={`${inputBase} min-h-[140px] resize-y`}
              aria-invalid={!!(clientErrors.description || state.errors?.description)}
            />
            {(clientErrors.description || state.errors?.description) && (
              <p className="text-xs text-red-600">{clientErrors.description || state.errors?.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              name="category"
              defaultValue={customFields.category ?? ""}
              className={inputBase}
              aria-invalid={!!(clientErrors.category || state.errors?.category)}
            />
            {(clientErrors.category || state.errors?.category) && (
              <p className="text-xs text-red-600">{clientErrors.category || state.errors?.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={Array.isArray(customFields.tags) ? customFields.tags.join(", ") : ""}
              placeholder="e.g. Grooming, Mobile, Senior Pets"
              className={inputBase}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="price">
              Base Price
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              defaultValue={listing.price ?? ""}
              className={inputBase}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="currency">
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              defaultValue={listing.currency ?? "USD"}
              className={inputBase}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="priceType">
              Price Type
            </label>
            <select id="priceType" name="priceType" defaultValue={listing.price_type ?? ""} className={inputBase}>
              <option value="">Select</option>
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
              <option value="variable">Variable</option>
              <option value="starting_at">Starting at</option>
            </select>
          </div>
        </div>
      </section>

      {/* Media */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Media</h2>
          <p className="text-sm text-gray-600">
            Set featured media and link to gallery management.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="featuredImageUrl">
              Featured Image URL
            </label>
            <input
              id="featuredImageUrl"
              name="featuredImageUrl"
              type="url"
              defaultValue={listing.featured_image ?? ""}
              className={inputBase}
              aria-invalid={!!(clientErrors.featuredImageUrl || state.errors?.featuredImageUrl)}
            />
            {(clientErrors.featuredImageUrl || state.errors?.featuredImageUrl) && (
              <p className="text-xs text-red-600">
                {clientErrors.featuredImageUrl || state.errors?.featuredImageUrl}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="videoUrl">
              Video URL
            </label>
            <input
              id="videoUrl"
              name="videoUrl"
              type="url"
              defaultValue={listing.video_url ?? ""}
              className={inputBase}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="logoUrl">
              Business Logo URL
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={provider.logoUrl ?? ""}
              className={inputBase}
            />
          </div>
        </div>
        <div>
          <Link href="/media" className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Manage gallery images →
          </Link>
        </div>
      </section>

      {/* Location */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-600">Business address and service area.</p>
        </div>
        <LocationField
          formId="listing-editor-form"
          defaultValue={addressDefault}
          initialAddressJson={
            listing.address && typeof listing.address === "object"
              ? JSON.stringify(listing.address)
              : undefined
          }
        />
        {(clientErrors.address || state.errors?.address) && (
          <p className="text-xs text-red-600">{clientErrors.address || state.errors?.address}</p>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="serviceMode">
              Service Mode
            </label>
            <select
              id="serviceMode"
              name="serviceMode"
              defaultValue={serviceArea.serviceMode ?? ""}
              className={inputBase}
            >
              <option value="">Select</option>
              <option value="mobile">Mobile</option>
              <option value="in_store">In-store</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="serviceRadius">
              Service Radius
            </label>
            <input
              id="serviceRadius"
              name="serviceRadius"
              type="number"
              step="0.1"
              defaultValue={serviceArea.radius ?? ""}
              className={inputBase}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="radiusUnit">
              Radius Unit
            </label>
            <select id="radiusUnit" name="radiusUnit" defaultValue={serviceArea.radiusUnit ?? ""} className={inputBase}>
              <option value="">Select</option>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </div>
        </div>
      </section>

      {/* Booking Provider */}
      {bookingProviders.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Booking Provider</h2>
            <p className="text-sm text-gray-600">
              Choose how bookings for this listing are handled. Cal.com syncs with your calendar.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="bookingProviderId">
              Provider
            </label>
            <select
              id="bookingProviderId"
              name="bookingProviderId"
              defaultValue={listing.booking_provider_id ?? ""}
              className={inputBase}
            >
              <option value="">Built-in (local only)</option>
              {bookingProviders.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.provider === "calcom" ? "Cal.com" : bp.provider === "gohighlevel" ? "GoHighLevel" : bp.provider}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p className="text-sm text-gray-600">Public contact info for customers.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="contactPhone">
              Phone
            </label>
            <input id="contactPhone" name="contactPhone" defaultValue={contact.phone ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="contactEmail">
              Email
            </label>
            <input id="contactEmail" name="contactEmail" type="email" defaultValue={contact.email ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="contactWebsite">
              Website
            </label>
            <input id="contactWebsite" name="contactWebsite" defaultValue={contact.website ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="contactBookingUrl">
              Booking URL
            </label>
            <input id="contactBookingUrl" name="contactBookingUrl" type="url" defaultValue={contact.bookingUrl ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="contactWhatsappUrl">
              WhatsApp Link
            </label>
            <input id="contactWhatsappUrl" name="contactWhatsappUrl" type="url" defaultValue={contact.whatsappUrl ?? ""} className={inputBase} />
          </div>
        </div>
      </section>

      {/* Provider Profile */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Provider Profile</h2>
          <p className="text-sm text-gray-600">Business and owner credentials.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="businessName">
              Business Name
            </label>
            <input id="businessName" name="businessName" defaultValue={provider.businessName ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="ownerName">
              Owner / Provider Name
            </label>
            <input id="ownerName" name="ownerName" defaultValue={provider.ownerName ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="yearsExperience">
              Years of Experience
            </label>
            <input id="yearsExperience" name="yearsExperience" type="number" defaultValue={provider.yearsExperience ?? ""} className={inputBase} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="certifications">
              Certifications (comma separated)
            </label>
            <input
              id="certifications"
              name="certifications"
              defaultValue={Array.isArray(provider.certifications) ? provider.certifications.join(", ") : ""}
              className={inputBase}
            />
          </div>
          <div className="flex items-center gap-2">
            <input id="insured" name="insured" type="checkbox" defaultChecked={provider.insured === true} />
            <label className="text-sm font-medium text-gray-700" htmlFor="insured">
              Insured
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="licenseNumber">
              Business License Number
            </label>
            <input id="licenseNumber" name="licenseNumber" defaultValue={provider.licenseNumber ?? ""} className={inputBase} />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Services</h2>
            <p className="text-sm text-gray-600">List individual services and pricing.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setServices((prev) => [
                ...prev,
                {
                  name: "",
                  price: "",
                  currency: "",
                  priceType: "",
                  durationMinutes: "",
                  description: "",
                  featured: false,
                },
              ])
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add service
          </button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-500">No services added yet.</p>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Service {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    placeholder="Service name"
                    className={inputBase}
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, "name", e.target.value)}
                  />
                  <input
                    placeholder="Price"
                    className={inputBase}
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, "price", e.target.value)}
                  />
                  <input
                    placeholder="Currency (e.g. USD)"
                    className={inputBase}
                    value={service.currency}
                    onChange={(e) => handleServiceChange(index, "currency", e.target.value)}
                  />
                  <select
                    className={inputBase}
                    value={service.priceType}
                    onChange={(e) => handleServiceChange(index, "priceType", e.target.value)}
                  >
                    <option value="">Price type</option>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="variable">Variable</option>
                    <option value="starting_at">Starting at</option>
                  </select>
                  <input
                    placeholder="Duration (minutes)"
                    className={inputBase}
                    value={service.durationMinutes}
                    onChange={(e) => handleServiceChange(index, "durationMinutes", e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={service.featured}
                      onChange={(e) => handleServiceChange(index, "featured", e.target.checked)}
                    />
                    Featured
                  </label>
                </div>
                <textarea
                  rows={3}
                  placeholder="Service description"
                  className={`${inputBase} min-h-[90px]`}
                  value={service.description}
                  onChange={(e) => handleServiceChange(index, "description", e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Packages */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Packages</h2>
            <p className="text-sm text-gray-600">Optional bundled offerings.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPackages((prev) => [
                ...prev,
                {
                  name: "",
                  price: "",
                  currency: "",
                  description: "",
                  includedServiceNames: "",
                },
              ])
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add package
          </button>
        </div>

        {packages.length === 0 ? (
          <p className="text-sm text-gray-500">No packages added yet.</p>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg, index) => (
              <div key={index} className="rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Package {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setPackages((prev) => prev.filter((_, i) => i !== index))}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    placeholder="Package name"
                    className={inputBase}
                    value={pkg.name}
                    onChange={(e) => handlePackageChange(index, "name", e.target.value)}
                  />
                  <input
                    placeholder="Price"
                    className={inputBase}
                    value={pkg.price}
                    onChange={(e) => handlePackageChange(index, "price", e.target.value)}
                  />
                  <input
                    placeholder="Currency"
                    className={inputBase}
                    value={pkg.currency}
                    onChange={(e) => handlePackageChange(index, "currency", e.target.value)}
                  />
                  <input
                    placeholder="Included services (comma separated)"
                    className={inputBase}
                    value={pkg.includedServiceNames}
                    onChange={(e) => handlePackageChange(index, "includedServiceNames", e.target.value)}
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Package description"
                  className={`${inputBase} min-h-[90px]`}
                  value={pkg.description}
                  onChange={(e) => handlePackageChange(index, "description", e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Opening Hours */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Opening Hours</h2>
          <p className="text-sm text-gray-600">Weekly schedule displayed on the listing.</p>
        </div>
        <div className="space-y-3">
          {dayLabels.map((day) => {
            const dayData = hours[day.key] || {};
            return (
              <div key={day.key} className="grid gap-3 md:grid-cols-4 items-center">
                <div className="flex items-center gap-2">
                  <input
                    id={`hours_${day.key}_open`}
                    name={`hours_${day.key}_open`}
                    type="checkbox"
                    defaultChecked={dayData.open === true}
                  />
                  <label className="text-sm font-medium text-gray-700" htmlFor={`hours_${day.key}_open`}>
                    {day.label}
                  </label>
                </div>
                <input
                  name={`hours_${day.key}_openTime`}
                  type="time"
                  defaultValue={dayData.openTime ?? ""}
                  className={inputBase}
                />
                <input
                  name={`hours_${day.key}_closeTime`}
                  type="time"
                  defaultValue={dayData.closeTime ?? ""}
                  className={inputBase}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Features & Amenities</h2>
          <p className="text-sm text-gray-600">Highlight what makes your service stand out.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { name: "featureParking", label: "Parking available", checked: features.parking === true },
            { name: "featurePetFriendly", label: "Pet-friendly", checked: features.petFriendly === true },
            { name: "featureMobileService", label: "Mobile service", checked: features.mobileService === true },
            { name: "featureOrganicProducts", label: "Organic products", checked: features.organicProducts === true },
            { name: "featureCertifiedGroomers", label: "Certified groomers", checked: features.certifiedGroomers === true },
            { name: "featurePickupDropoff", label: "Pickup/dropoff", checked: features.pickupDropoff === true },
            { name: "featureSpaServices", label: "Spa services", checked: features.spaServices === true },
            { name: "featureEcoFriendly", label: "Eco-friendly", checked: features.ecoFriendly === true },
          ].map((item) => (
            <label key={item.name} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name={item.name} defaultChecked={item.checked} />
              {item.label}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="featureCustom">
            Custom features (comma separated)
          </label>
          <input
            id="featureCustom"
            name="featureCustom"
            defaultValue={Array.isArray(features.custom) ? features.custom.join(", ") : ""}
            className={inputBase}
          />
        </div>
      </section>

      {/* Social Links */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Social Links</h2>
          <p className="text-sm text-gray-600">Add social profiles for customers.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <input id="socialInstagram" name="socialInstagram" placeholder="Instagram" defaultValue={social.instagram ?? ""} className={inputBase} />
          <input id="socialFacebook" name="socialFacebook" placeholder="Facebook" defaultValue={social.facebook ?? ""} className={inputBase} />
          <input id="socialTiktok" name="socialTiktok" placeholder="TikTok" defaultValue={social.tiktok ?? ""} className={inputBase} />
          <input id="socialLinkedin" name="socialLinkedin" placeholder="LinkedIn" defaultValue={social.linkedin ?? ""} className={inputBase} />
          <input id="socialYoutube" name="socialYoutube" placeholder="YouTube" defaultValue={social.youtube ?? ""} className={inputBase} />
          <input id="socialX" name="socialX" placeholder="X / Twitter" defaultValue={social.x ?? ""} className={inputBase} />
        </div>
      </section>

      {/* Actions: Continue saves and returns to listing management; Publish/Unpublish/Delete are on the Listings page */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
        <DeleteListingButton
          listingId={listing.id}
          listingTitle={listing.title}
          deleteAction={deleteListing}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Continue"}
        </button>
      </section>
    </form>
  );
}
