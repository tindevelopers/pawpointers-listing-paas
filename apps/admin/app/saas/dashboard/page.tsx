"use client";

import Link from "next/link";
import TenantBreadcrumbs from "@/components/tenant/TenantBreadcrumbs";
import SupabaseConnectionStatus from "@/components/supabase/SupabaseConnectionStatus";
import { useTenant } from "@/core/multi-tenancy";
import MemberDashboard from "@/components/dashboard/MemberDashboard";
import React from "react";

const PlatformDashboardContent: React.FC<{
  tenant: { name?: string } | null;
  isLoading: boolean;
}> = ({ tenant, isLoading }) => (
  <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-indigo-500 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500 blur-[140px]" />
      </div>
      <div className="relative space-y-4">
        <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
          Welcome{tenant?.name ? ` to ${tenant.name}` : ""}
        </h1>
        <p className="max-w-2xl text-white/70">
          {isLoading
            ? "Loading..."
            : tenant
            ? `Manage your ${tenant.name} workspace from this dashboard.`
            : "Get started by creating or selecting a tenant."}
        </p>
      </div>
    </section>

    <SupabaseConnectionStatus />

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Quick Stats
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dashboard statistics will appear here
        </p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Recent Activity
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recent activity will appear here
        </p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Quick Actions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Quick actions will appear here
        </p>
      </div>
    </div>
    <div className="rounded-3xl border border-dashed border-gray-200 bg-white/30 p-6 text-sm text-gray-500">
      <p className="mb-2 font-semibold text-gray-900">
        Member experience coming soon
      </p>
      <p>
        Members will be greeted by their activity feed, bookings, listings, and
        quick links once this dashboard is tailored for their tenant.
      </p>
      <div className="mt-4">
        <Link
          href="/saas/support/tickets"
          className="text-sm font-semibold text-indigo-600 underline-offset-4 hover:underline"
        >
          Preview support tickets
        </Link>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { tenant, isLoading } = useTenant();

  return (
    <div className="space-y-6">
      <TenantBreadcrumbs items={[{ label: "Dashboard", href: "/saas/dashboard" }]} />

      {isLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Loading dashboard...
        </div>
      ) : tenant ? (
        <MemberDashboard tenantId={tenant.id} tenantName={tenant.name} />
      ) : (
        <PlatformDashboardContent tenant={tenant} isLoading={isLoading} />
      )}
    </div>
  );
}
