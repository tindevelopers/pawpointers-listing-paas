"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DashboardActivity, DashboardActivitySource } from "@/app/actions/dashboard";

interface MemberDashboardProps {
  tenantId: string;
  tenantName?: string | null;
}

type ActivityStat = {
  label: string;
  value: number;
  description: string;
};

const QUICK_ACTIONS = [
  { label: "View Bookings", href: "/saas/bookings" },
  { label: "Manage CRM", href: "/crm/contacts" },
  { label: "Open Support", href: "/saas/support/tickets" },
];

const SOURCE_STYLES: Record<
  DashboardActivitySource,
  { label: string; accent: string; hue: string }
> = {
  activity: { label: "CRM", accent: "bg-indigo-50 text-indigo-700", hue: "text-indigo-500" },
  booking: { label: "Booking", accent: "bg-emerald-50 text-emerald-700", hue: "text-emerald-500" },
  listing: { label: "Listing", accent: "bg-sky-50 text-sky-700", hue: "text-sky-500" },
  review: { label: "Review", accent: "bg-amber-50 text-amber-700", hue: "text-amber-500" },
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function MemberDashboard({ tenantId, tenantName }: MemberDashboardProps) {
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setActivities([]);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const loadActivities = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dashboard/activities?tenantId=${tenantId}&limit=8`,
          { cache: "no-store", signal: controller.signal }
        );

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load activities");
        }

        if (!isMounted) return;
        setActivities(payload.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load recent activities"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantId]);

  const stats = useMemo<ActivityStat[]>(
    () => [
      {
        label: "Total Updates",
        value: activities.length,
        description: "Bookings, listings, and CRM actions",
      },
      {
        label: "Bookings",
        value: activities.filter((activity) => activity.source === "booking").length,
        description: "Recent appointments and confirmations",
      },
      {
        label: "Listings",
        value: activities.filter((activity) => activity.source === "listing").length,
        description: "Published or updated listings",
      },
      {
        label: "Reviews",
        value: activities.filter((activity) => activity.source === "review").length,
        description: "New customer reviews",
      },
    ],
    [activities]
  );

  const activityFeed = isLoading ? [] : activities.length > 0 ? activities : [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-100 bg-gradient-to-br from-indigo-50 via-white to-white/80 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
            Member Dashboard
          </p>
          <h2 className="text-3xl font-semibold text-gray-900">
            Welcome back, {tenantName ?? "your team"}!
          </h2>
          <p className="text-sm text-gray-500">
            Review your recent activity and take quick action on what matters most.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm shadow-white/40"
            >
              <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                Activity Feed
              </p>
              <h3 className="text-lg font-semibold text-gray-900">
                Recent work items
              </h3>
            </div>
            <p className="text-xs text-gray-400">{activities.length} items</p>
          </div>

          <div className="mt-4 space-y-4">
            {isLoading && (
              <p className="text-sm text-gray-500">Loading recent activity...</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!isLoading && !activityFeed.length && !error && (
              <p className="text-sm text-gray-500">
                No activity yet. Check back once you start creating bookings,
                listings, or CRM updates.
              </p>
            )}
            {activityFeed.map((activity) => {
              const source = SOURCE_STYLES[activity.source];
              return (
                <div
                  key={activity.id}
                  className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 shadow-sm"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-semibold ${source.accent}`}
                  >
                    {source.label[0]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {activity.title}
                      </p>
                      <span className={`text-xs font-medium uppercase ${source.hue}`}>
                        {source.label}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  Quick Actions
                </p>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pick something to do
                </h3>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-2xl border border-transparent bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-500">
              Tip
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Keep your listings up to date, respond to booking requests quickly,
              and acknowledge new reviews to stay ahead of your marketplace.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
