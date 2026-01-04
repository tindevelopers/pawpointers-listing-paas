"use client";

import React, { useState, useEffect } from "react";
"use client";

import React, { useState, useEffect } from "react";
import {
  getRevenueSummary,
  getPayoutHistory,
  type PayoutDetails,
} from "@tinadmin/core/billing";
import { cn } from "../utils/cn";

export interface RevenueDashboardProps {
  listingId?: string;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export function RevenueDashboard({
  listingId,
  startDate,
  endDate,
  className,
}: RevenueDashboardProps) {
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    platformFees: number;
    listingOwnerAmount: number;
    pendingPayout: number;
    paidOut: number;
    transactionCount: number;
    bookingCount: number;
  } | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [listingId, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryResult, historyResult] = await Promise.all([
        getRevenueSummary({ listingId, startDate, endDate }),
        getPayoutHistory({ limit: 10 }),
      ]);

      if (summaryResult.success && summaryResult.summary) {
        setSummary(summaryResult.summary);
      } else {
        setError(summaryResult.error || "Failed to load revenue summary");
      }

      if (historyResult.success && historyResult.payouts) {
        setPayoutHistory(historyResult.payouts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50";
      case "processing":
        return "text-blue-600 bg-blue-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "failed":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="text-center text-gray-500">Loading revenue data...</div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className={cn("p-6", className)}>
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h2>
        <p className="mt-2 text-gray-600">Track your earnings and payouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {summary.transactionCount} transactions
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Platform Fees</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(summary.platformFees)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {((summary.platformFees / summary.totalRevenue) * 100).toFixed(1)}% of revenue
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Your Earnings</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(summary.listingOwnerAmount)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {summary.bookingCount} bookings
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Pending Payout</div>
          <div className="mt-2 text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.pendingPayout)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Awaiting payout</div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payouts</h3>
        {payoutHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No payout history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bookings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payoutHistory.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payout.total_amount, payout.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={cn(
                          "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                          getStatusColor(payout.status)
                        )}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.booking_ids?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

