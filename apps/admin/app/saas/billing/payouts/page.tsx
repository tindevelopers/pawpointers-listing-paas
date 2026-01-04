"use client";

import React, { useState, useEffect } from "react";
import {
  getPendingPayouts,
  createPayout,
  getPayoutHistory,
  type PendingPayout,
  type PayoutDetails,
} from "@/core/billing";

export default function PayoutsPage() {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterTenantId, setFilterTenantId] = useState<string | undefined>();
  const [filterListingId, setFilterListingId] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, [filterTenantId, filterListingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pendingResult, historyResult] = await Promise.all([
        getPendingPayouts({
          tenantId: filterTenantId,
          listingId: filterListingId,
        }),
        getPayoutHistory(),
      ]);

      if (pendingResult.success && pendingResult.payouts) {
        setPendingPayouts(pendingResult.payouts);
      } else {
        setError(pendingResult.error || "Failed to load pending payouts");
      }

      if (historyResult.success && historyResult.payouts) {
        setPayoutHistory(historyResult.payouts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async (payout: PendingPayout) => {
    try {
      setCreating(payout.id);
      setError(null);

      const result = await createPayout({
        tenantId: payout.tenant_id,
        listingId: payout.listing_id || undefined,
        amount: payout.total_amount,
        currency: payout.currency,
      });

      if (result.success) {
        await loadData();
      } else {
        setError(result.error || "Failed to create payout");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payout");
    } finally {
      setCreating(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading payouts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
        <p className="mt-2 text-gray-600">
          Review and process payouts for listing owners
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Tenant
            </label>
            <input
              type="text"
              value={filterTenantId || ""}
              onChange={(e) => setFilterTenantId(e.target.value || undefined)}
              placeholder="Tenant ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Listing
            </label>
            <input
              type="text"
              value={filterListingId || ""}
              onChange={(e) => setFilterListingId(e.target.value || undefined)}
              placeholder="Listing ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Pending Payouts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Payouts</h2>
        {pendingPayouts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No pending payouts</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Listing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bookings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Transactions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payout.tenant_name || payout.tenant_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.listing_name || payout.listing_id || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payout.total_amount, payout.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.booking_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.revenue_transaction_count}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleCreatePayout(payout)}
                        disabled={creating === payout.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creating === payout.id ? "Processing..." : "Create Payout"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h2>
        {payoutHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No payout history</div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stripe Payout ID
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
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payout.status === "paid"
                            ? "text-green-600 bg-green-50"
                            : payout.status === "processing"
                            ? "text-blue-600 bg-blue-50"
                            : payout.status === "pending"
                            ? "text-yellow-600 bg-yellow-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.booking_ids?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {payout.stripe_payout_id || "N/A"}
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

