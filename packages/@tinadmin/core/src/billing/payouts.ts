"use server";

import { getStripeLazy } from "./config";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { requirePermission } from "@/core/permissions/middleware";
import type Stripe from "stripe";

// Lazy getter for Stripe instance to prevent build-time errors
function getStripe(): Stripe {
  const stripe = getStripeLazy();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  return stripe;
}

export interface PendingPayout {
  id: string;
  tenant_id: string;
  listing_id: string | null;
  total_amount: number;
  currency: string;
  booking_count: number;
  revenue_transaction_count: number;
  tenant_name?: string;
  listing_name?: string;
}

export interface PayoutDetails {
  id: string;
  tenant_id: string;
  listing_id: string | null;
  total_amount: number;
  currency: string;
  stripe_payout_id: string | null;
  status: string;
  booking_ids: string[];
  revenue_transaction_ids: string[];
  processed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get pending payouts for admin review
 */
export async function getPendingPayouts(params?: {
  tenantId?: string;
  listingId?: string;
  minimumAmount?: number;
}): Promise<{
  success: boolean;
  payouts?: PendingPayout[];
  error?: string;
}> {
  try {
    await requirePermission("billing.read");

    const adminClient = createAdminClient();

    // Get Connect accounts with pending payouts
    let query = adminClient
      .from("stripe_connect_accounts")
      .select(
        "tenant_id, pending_payout, default_currency, tenants(name), listings(id, title)"
      )
      .gt("pending_payout", 0);

    if (params?.tenantId) {
      query = query.eq("tenant_id", params.tenantId);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) {
      return { success: false, error: accountsError.message };
    }

    // Get revenue transactions for each account
    const payouts: PendingPayout[] = [];

    for (const account of (accounts || []) as any[]) {
      if (params?.minimumAmount && account.pending_payout < params.minimumAmount) {
        continue;
      }

      // Get revenue transactions for this tenant
      // Note: revenue_transactions doesn't have payout_id, we'll track via payouts table
      let revenueQuery = adminClient
        .from("revenue_transactions")
        .select("id, booking_id, listing_id, listing_owner_amount")
        .eq("tenant_id", account.tenant_id)
        .eq("status", "completed");

      if (params?.listingId) {
        revenueQuery = revenueQuery.eq("listing_id", params.listingId);
      }

      const { data: transactions } = await revenueQuery;

      if (!transactions || transactions.length === 0) {
        continue;
      }

      // Get unique booking IDs
      const bookingIds = [
        ...new Set(
          (transactions || [])
            .map((t: any) => t.booking_id)
            .filter((id): id is string => !!id)
        ),
      ];

      // Get unique listing IDs
      const listingIds = [
        ...new Set(
          (transactions || [])
            .map((t: any) => t.listing_id)
            .filter((id): id is string => !!id)
        ),
      ];

      // Group by listing if multiple listings
      if (listingIds.length === 1) {
        payouts.push({
          id: account.tenant_id, // Temporary ID
          tenant_id: account.tenant_id,
          listing_id: listingIds[0],
          total_amount: account.pending_payout,
          currency: account.default_currency || "usd",
          booking_count: bookingIds.length,
          revenue_transaction_count: transactions.length,
          tenant_name: (account.tenants as any)?.name,
          listing_name: (account.listings as any)?.[0]?.title,
        });
      } else {
        // Multiple listings - create one payout per listing
        for (const listingId of listingIds) {
          const listingTransactions = (transactions || []).filter(
            (t: any) => t.listing_id === listingId
          );
          const listingBookingIds = [
            ...new Set(
              listingTransactions
                .map((t: any) => t.booking_id)
                .filter((id): id is string => !!id)
            ),
          ];

          // Calculate amount for this listing
          const listingAmount = listingTransactions.reduce(
            (sum: number, t: any) => sum + (t.listing_owner_amount || 0),
            0
          );

          payouts.push({
            id: `${account.tenant_id}-${listingId}`,
            tenant_id: account.tenant_id,
            listing_id: listingId,
            total_amount: listingAmount,
            currency: account.default_currency || "usd",
            booking_count: listingBookingIds.length,
            revenue_transaction_count: listingTransactions.length,
            tenant_name: (account.tenants as any)?.name,
          });
        }
      }
    }

    return { success: true, payouts };
  } catch (error) {
    console.error("Error fetching pending payouts:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch pending payouts",
    };
  }
}

/**
 * Create a manual payout
 */
export async function createPayout(params: {
  tenantId: string;
  listingId?: string;
  amount?: number; // Optional: specific amount, otherwise uses all pending
  currency?: string;
}): Promise<{
  success: boolean;
  payoutId?: string;
  error?: string;
}> {
  try {
    await requirePermission("billing.write");

    const adminClient = createAdminClient();

    // Get Connect account
    const accountResult: {
      data: {
        stripe_account_id: string;
        pending_payout: number;
        default_currency: string;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_connect_accounts")
      .select("stripe_account_id, pending_payout, default_currency")
      .eq("tenant_id", params.tenantId)
      .single();

    if (!accountResult.data) {
      return { success: false, error: "Connect account not found" };
    }

    const account = accountResult.data;
    const payoutAmount = params.amount || account.pending_payout;
    const currency = params.currency || account.default_currency || "usd";

    if (payoutAmount <= 0) {
      return { success: false, error: "No pending payout amount" };
    }

    // Get revenue transactions to include in payout
    // Check which transactions are not yet in a completed payout
    const existingPayoutsResult = await adminClient
      .from("payouts")
      .select("revenue_transaction_ids")
      .eq("tenant_id", params.tenantId)
      .in("status", ["pending", "processing", "paid"]);

    const existingTransactionIds = new Set(
      ((existingPayoutsResult.data || []) as any[]).flatMap((p: any) => p.revenue_transaction_ids || [])
    );

    let revenueQuery = adminClient
      .from("revenue_transactions")
      .select("id, booking_id, listing_owner_amount")
      .eq("tenant_id", params.tenantId)
      .eq("status", "completed");

    if (params.listingId) {
      revenueQuery = revenueQuery.eq("listing_id", params.listingId);
    }

    const { data: allTransactions } = await revenueQuery;

    if (!allTransactions || allTransactions.length === 0) {
      return { success: false, error: "No revenue transactions found" };
    }

    // Filter out transactions already in payouts
    const transactions = (allTransactions || []).filter(
      (t: any) => !existingTransactionIds.has(t.id)
    );

    if (transactions.length === 0) {
      return { success: false, error: "All transactions already included in payouts" };
    }

    const transactionIds = transactions.map((t: any) => t.id);
    const bookingIds = [
      ...new Set(
        transactions
          .map((t: any) => t.booking_id)
          .filter((id): id is string => !!id)
      ),
    ];

    // Get current user for audit
    const { data: { user } } = await adminClient.auth.getUser();
    const createdBy = user?.id || null;

    // Create payout record in database
    const { data: payout, error: payoutError } = await (adminClient
      .from("payouts") as any)
      .insert({
        tenant_id: params.tenantId,
        listing_id: params.listingId || null,
        total_amount: payoutAmount,
        currency: currency,
        status: "pending",
        booking_ids: bookingIds,
        revenue_transaction_ids: transactionIds,
        created_by: createdBy,
      })
      .select()
      .single();

    if (payoutError) {
      return { success: false, error: payoutError.message };
    }

    // Create payout in Stripe
    try {
      const stripePayout = await getStripe().payouts.create(
        {
          amount: Math.round(payoutAmount), // Convert to cents
          currency: currency,
          metadata: {
            payout_id: payout.id,
            tenant_id: params.tenantId,
            booking_count: bookingIds.length.toString(),
            transaction_count: transactionIds.length.toString(),
          },
        },
        {
          stripeAccount: account.stripe_account_id,
        }
      );

      // Update payout record with Stripe payout ID
      await (adminClient
        .from("payouts") as any)
        .update({
          stripe_payout_id: stripePayout.id,
          status: "processing",
        })
        .eq("id", payout.id);

      // Note: revenue_transactions table doesn't have payout_id column
      // Payout tracking is done via payouts.revenue_transaction_ids array

      // Update bookings payout status
      await (adminClient
        .from("bookings") as any)
        .update({ payout_status: "transferred", payout_id: payout.id })
        .in("id", bookingIds);

      return { success: true, payoutId: payout.id };
    } catch (stripeError) {
      // If Stripe payout fails, mark payout as failed
      await (adminClient
        .from("payouts") as any)
        .update({ status: "failed" })
        .eq("id", payout.id);

      return {
        success: false,
        error:
          stripeError instanceof Error
            ? stripeError.message
            : "Failed to create Stripe payout",
      };
    }
  } catch (error) {
    console.error("Error creating payout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payout",
    };
  }
}

/**
 * Get payout history
 */
export async function getPayoutHistory(params?: {
  tenantId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  payouts?: PayoutDetails[];
  error?: string;
}> {
  try {
    const tenantId = params?.tenantId || (await getCurrentTenant());
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from("payouts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data: payouts, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      payouts: (payouts || []) as PayoutDetails[],
    };
  } catch (error) {
    console.error("Error fetching payout history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payout history",
    };
  }
}

/**
 * Get payout details
 */
export async function getPayoutDetails(
  payoutId: string
): Promise<{
  success: boolean;
  payout?: PayoutDetails;
  error?: string;
}> {
  try {
    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    const { data: payout, error } = await adminClient
      .from("payouts")
      .select("*")
      .eq("id", payoutId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, payout: payout as PayoutDetails };
  } catch (error) {
    console.error("Error fetching payout details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payout details",
    };
  }
}

/**
 * Get revenue summary for listing owner
 */
export async function getRevenueSummary(params?: {
  listingId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  summary?: {
    totalRevenue: number;
    platformFees: number;
    listingOwnerAmount: number;
    pendingPayout: number;
    paidOut: number;
    transactionCount: number;
    bookingCount: number;
  };
  error?: string;
}> {
  try {
    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    // Build query
    let query = adminClient
      .from("revenue_transactions")
      .select("amount, platform_fee, listing_owner_amount, booking_id")
      .eq("tenant_id", tenantId);

    if (params?.listingId) {
      query = query.eq("listing_id", params.listingId);
    }

    if (params?.startDate) {
      query = query.gte("created_at", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("created_at", params.endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const completedTransactions = ((transactions || []) as any[]).filter(
      (t: any) => t.status === "completed"
    );

    const totalRevenue = completedTransactions.reduce(
      (sum: number, t: any) => sum + (t.amount || 0),
      0
    );
    const platformFees = completedTransactions.reduce(
      (sum: number, t: any) => sum + (t.platform_fee || 0),
      0
    );
    const listingOwnerAmount = completedTransactions.reduce(
      (sum: number, t: any) => sum + (t.listing_owner_amount || 0),
      0
    );

    // Get pending payout from Connect account
    const { data: account } = await adminClient
      .from("stripe_connect_accounts")
      .select("pending_payout, paid_out")
      .eq("tenant_id", tenantId)
      .single();

    const bookingIds = [
      ...new Set(
        completedTransactions
          .map((t: any) => t.booking_id)
          .filter((id): id is string => !!id)
      ),
    ];

    const accountData = account as any;
    return {
      success: true,
      summary: {
        totalRevenue,
        platformFees,
        listingOwnerAmount,
        pendingPayout: accountData?.pending_payout || 0,
        paidOut: accountData?.paid_out || 0,
        transactionCount: completedTransactions.length,
        bookingCount: bookingIds.length,
      },
    };
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch revenue summary",
    };
  }
}

