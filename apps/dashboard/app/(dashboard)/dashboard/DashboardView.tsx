"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ListIcon,
  StarIcon,
  MailIcon,
  FolderIcon,
  PlusIcon,
  CalenderIcon,
  ArrowRightIcon,
  UserCircleIcon,
  FileIcon,
  PieChartIcon,
  BuildingIcon,
  HorizontaLDots,
  ChevronDownIcon,
} from "@/icons";

type Card = { label: string; value: number; href: string };

const STAGGER_DELAY_MS = 50;

const CARD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Listings: ListIcon,
  Bookings: CalenderIcon,
  Reviews: StarIcon,
  Inbox: MailIcon,
};

const QUICK_ACTIONS = [
  {
    title: "Publish a listing",
    description: "Create and publish new listings to your site.",
    href: "/listings",
    icon: ListIcon,
  },
  {
    title: "Boost your profile",
    description: "Customize your merchant profile details.",
    href: "/merchant-profile",
    icon: BuildingIcon,
  },
  {
    title: "Monitor activity",
    description: "Review stats for listings, bookings & reviews.",
    href: "/listings",
    icon: PieChartIcon,
  },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

export function DashboardView({
  tenantId,
  cards,
}: {
  tenantId: string | null;
  cards: Card[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="animate-fade-in pb-4 border-b border-gray-200/90">
        <p className="text-sm text-gray-500">Tenant</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tenant ID: {tenantId ?? "Not linked"} — manage your listings, respond to reviews, and stay
          on top of customer messages.
        </p>
      </header>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const CardIcon = CARD_ICONS[card.label];
          return (
            <Link
              key={card.label}
              href={card.href}
              className="animate-fade-in-up block rounded-[14px] border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              style={{
                opacity: 0,
                animationDelay: `${(i + 1) * STAGGER_DELAY_MS}ms`,
              }}
            >
              {CardIcon && (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-5 [&>svg]:w-5">
                  <CardIcon />
                </span>
              )}
              <p className="mt-2 text-sm text-gray-500">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Toolbar: search, filters, Add listing */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <FilterIcon className="h-4 w-4 text-gray-500" />
            2 Filters
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <Link
          href="/listings"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] bg-orange-500 px-5 py-2.5 font-medium !text-white shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-orange-600 hover:!text-white hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 [&_svg]:text-white"
        >
          <PlusIcon className="h-5 w-5 shrink-0" />
          Add listing
        </Link>
      </div>

      {/* Two columns: Recent Activity + Quick Start Guide | Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <section className="rounded-[14px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <HorizontaLDots className="h-5 w-5" />
                </button>
                <Link
                  href="/listings"
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="View more"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                <FileIcon className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">No recent activity</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Your latest tenant activity will appear here.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <ListIcon className="h-4 w-4 text-orange-500" />
                View Listings
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <UserCircleIcon className="h-4 w-4 text-orange-500" />
                User Profile
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </section>

          {/* Quick Start Guide */}
          <section className="rounded-[14px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Quick Start Guide</h2>
            <p className="mt-1 text-sm text-gray-600">
              Create and publish a new listing to your site.
            </p>
            <ol className="mt-5 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-4 [&>svg]:w-4">
                  <ListIcon />
                </span>
                <span className="text-gray-700">
                  Publish your{" "}
                  <Link href="/listings" className="quick-start-link">
                    listings
                  </Link>
                  .
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-4 [&>svg]:w-4">
                  <FolderIcon />
                </span>
                <span className="text-gray-700">
                  Add photos in{" "}
                  <Link href="/media" className="quick-start-link">
                    media
                  </Link>{" "}
                  once your draft is saved.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-4 [&>svg]:w-4">
                  <StarIcon />
                </span>
                <span className="text-gray-700">
                  Respond to{" "}
                  <Link href="/reviews" className="quick-start-link">
                    reviews
                  </Link>{" "}
                  to build trust.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-4 [&>svg]:w-4">
                  <MailIcon />
                </span>
                <span className="text-gray-700">
                  Keep up with leads in the{" "}
                  <Link href="/inbox" className="quick-start-link">
                    inbox
                  </Link>
                  .
                </span>
              </li>
            </ol>
          </section>
        </div>

        {/* Right column: Quick Actions */}
        <section className="rounded-[14px] border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="flex items-center gap-1">
              <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <HorizontaLDots className="h-5 w-5" />
              </button>
              <Link
                href="/listings"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="View more"
              >
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <ul className="mt-5 space-y-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.title}>
                  <Link
                    href={action.href}
                    className="group flex items-start gap-3 rounded-lg p-3 transition hover:bg-gray-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 [&>svg]:h-5 [&>svg]:w-5">
                      <Icon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 group-hover:text-orange-600">
                        {action.title}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">{action.description}</p>
                    </div>
                    <ArrowRightIcon className="mt-1 h-5 w-5 shrink-0 text-gray-400 group-hover:text-orange-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ListIcon className="h-4 w-4 text-orange-500" />
              View Listings
              <ArrowRightIcon className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <UserCircleIcon className="h-4 w-4 text-orange-500" />
              User Profile
              <ArrowRightIcon className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
