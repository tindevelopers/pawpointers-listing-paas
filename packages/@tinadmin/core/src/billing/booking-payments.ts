"use server";

import { getStripe } from "./config";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import {
  calculateRevenue,
  type RevenueCalculation,
  type RevenueSettings,
  getDefaultRevenueSettings,
} from "./revenue";
import type Stripe from "stripe";

const stripe = getStripe();

export interface BookingPaymentParams {
  bookingId: string;
  listingOwnerTenantId: string;
  customerTenantId: string;
  amount: number; // Amount in cents
  feePercent?: number;
  feeFixed?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface BookingPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  revenueCalculation?: RevenueCalculation;
  error?: string;
}

/**
 * Create a booking payment with Stripe Connect
 * Uses modern transfer_data API instead of deprecated application_fee_amount
 */
export async function createBookingPayment(
  params: BookingPaymentParams
): Promise<BookingPaymentResult> {
  try {
    const adminClient = createAdminClient();
    const currency = params.currency || "usd";

    // Get Connect account for listing owner
    const connectAccountResult: {
      data: {
        stripe_account_id: string;
        revenue_settings: RevenueSettings;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_connect_accounts")
      .select("stripe_account_id, revenue_settings")
      .eq("tenant_id", params.listingOwnerTenantId)
      .single();

    if (!connectAccountResult.data) {
      return {
        success: false,
        error: "Connect account not found for listing owner",
      };
    }

    const connectAccount = connectAccountResult.data;
    const revenueSettings =
      (connectAccount.revenue_settings as RevenueSettings) ||
      getDefaultRevenueSettings();

    // Use provided fees or defaults from Connect account settings
    const feePercent = params.feePercent ?? revenueSettings.feePercent;
    const feeFixed = params.feeFixed ?? revenueSettings.feeFixed;

    // Calculate revenue split
    const revenueCalculation = calculateRevenue(
      params.amount,
      feePercent,
      feeFixed,
      currency
    );

    // Get or create customer for booking customer
    const customerResult: {
      data: { stripe_customer_id: string } | null;
      error: any;
    } = await adminClient
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", params.customerTenantId)
      .single();

    let customerId: string | undefined;
    if (!customerResult.data) {
      // Create customer if doesn't exist
      // Note: This should ideally be done earlier in the booking flow
      // For now, we'll require customer to exist
      return {
        success: false,
        error: "Customer not found. Please ensure customer is created first.",
      };
    }
    customerId = customerResult.data.stripe_customer_id;

    // Create payment intent with transfer_data (modern approach)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: currency,
      customer: customerId,
      transfer_data: {
        destination: connectAccount.stripe_account_id,
        amount: revenueCalculation.listingOwnerAmount,
      },
      // Platform keeps: totalAmount - listingOwnerAmount automatically
      metadata: {
        booking_id: params.bookingId,
        listing_owner_tenant_id: params.listingOwnerTenantId,
        customer_tenant_id: params.customerTenantId,
        platform_fee_percent: feePercent.toString(),
        platform_fee_fixed: feeFixed.toString(),
        platform_fee_total: revenueCalculation.platformFeeTotal.toString(),
        listing_owner_amount: revenueCalculation.listingOwnerAmount.toString(),
        ...params.metadata,
      },
      description: `Booking payment for booking ${params.bookingId}`,
    });

    // Update booking with payment intent and revenue details
    await adminClient
      .from("bookings")
      .update({
        payment_intent_id: paymentIntent.id,
        platform_fee_percent: revenueCalculation.platformFeePercent,
        platform_fee_fixed: revenueCalculation.platformFeeFixed,
        platform_fee_total: revenueCalculation.platformFeeTotal,
        listing_owner_amount: revenueCalculation.listingOwnerAmount,
        stripe_connect_account_id: connectAccount.stripe_account_id,
        payment_status: "processing",
      })
      .eq("id", params.bookingId);

    // Create revenue transaction record
    await adminClient.from("revenue_transactions").insert({
      booking_id: params.bookingId,
      tenant_id: params.listingOwnerTenantId,
      listing_id: (
        await adminClient
          .from("bookings")
          .select("listing_id")
          .eq("id", params.bookingId)
          .single()
      ).data?.listing_id,
      transaction_type: "booking",
      amount: params.amount,
      platform_fee: revenueCalculation.platformFeeTotal,
      listing_owner_amount: revenueCalculation.listingOwnerAmount,
      currency: currency,
      stripe_payment_intent_id: paymentIntent.id,
      status: "pending",
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      revenueCalculation,
    };
  } catch (error) {
    console.error("Error creating booking payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create booking payment",
    };
  }
}

/**
 * Process booking payment confirmation
 * Called when payment intent succeeds
 */
export async function processBookingPayment(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return {
        success: false,
        error: `Payment not succeeded. Status: ${paymentIntent.status}`,
      };
    }

    // Find booking by payment intent ID
    const bookingResult: {
      data: { id: string; listing_id: string; tenant_id: string } | null;
      error: any;
    } = await adminClient
      .from("bookings")
      .select("id, listing_id, tenant_id")
      .eq("payment_intent_id", paymentIntentId)
      .single();

    if (!bookingResult.data) {
      return { success: false, error: "Booking not found" };
    }

    const booking = bookingResult.data;

    // Update booking payment status
    await adminClient
      .from("bookings")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        status: "confirmed",
      })
      .eq("id", booking.id);

    // Update revenue transaction status
    await adminClient
      .from("revenue_transactions")
      .update({
        status: "completed",
        stripe_transfer_id: (paymentIntent.transfer_data as any)?.transfer || null,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);

    // Update Connect account revenue totals
    const bookingDetails: {
      data: {
        listing_owner_amount: number;
        stripe_connect_account_id: string;
      } | null;
    } = await adminClient
      .from("bookings")
      .select("listing_owner_amount, stripe_connect_account_id")
      .eq("id", booking.id)
      .single();

    if (bookingDetails.data) {
      await adminClient.rpc("update_connect_account_revenue", {
        account_id: bookingDetails.data.stripe_connect_account_id,
        amount: bookingDetails.data.listing_owner_amount,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing booking payment:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process booking payment",
    };
  }
}

/**
 * Refund booking payment
 * Handles partial and full refunds with proper fee handling
 */
export async function refundBookingPayment(
  bookingId: string,
  amount?: number, // Optional: partial refund amount in cents
  reason?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Get booking details
    const bookingResult: {
      data: {
        payment_intent_id: string;
        total_amount: number;
        listing_owner_amount: number;
        platform_fee_total: number;
        stripe_connect_account_id: string;
      } | null;
      error: any;
    } = await adminClient
      .from("bookings")
      .select(
        "payment_intent_id, total_amount, listing_owner_amount, platform_fee_total, stripe_connect_account_id"
      )
      .eq("id", bookingId)
      .single();

    if (!bookingResult.data || !bookingResult.data.payment_intent_id) {
      return { success: false, error: "Booking or payment intent not found" };
    }

    const booking = bookingResult.data;
    const refundAmount = amount || booking.total_amount;

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: refundAmount,
      reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : undefined,
      metadata: {
        booking_id: bookingId,
        refund_type: amount ? "partial" : "full",
      },
    });

    // Calculate proportional refund amounts
    const refundRatio = refundAmount / booking.total_amount;
    const refundedPlatformFee = Math.round(
      booking.platform_fee_total * refundRatio
    );
    const refundedListingOwnerAmount = Math.round(
      booking.listing_owner_amount * refundRatio
    );

    // Update booking
    await adminClient
      .from("bookings")
      .update({
        payment_status: refundAmount === booking.total_amount ? "refunded" : "partially_refunded",
        refund_amount: refundAmount,
      })
      .eq("id", bookingId);

    // Update revenue transaction
    await adminClient
      .from("revenue_transactions")
      .update({
        status: "refunded",
      })
      .eq("booking_id", bookingId);

    // Update Connect account revenue (reduce totals)
    const accountResult = await adminClient
      .from("stripe_connect_accounts")
      .select("total_revenue, pending_payout")
      .eq("stripe_account_id", booking.stripe_connect_account_id)
      .single();

    if (accountResult.data) {
      await adminClient
        .from("stripe_connect_accounts")
        .update({
          total_revenue: Math.max(0, accountResult.data.total_revenue - refundedListingOwnerAmount),
          pending_payout: Math.max(0, accountResult.data.pending_payout - refundedListingOwnerAmount),
        })
        .eq("stripe_account_id", booking.stripe_connect_account_id);
    }

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error("Error refunding booking payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to refund booking payment",
    };
  }
}

/**
 * Calculate booking total including add-ons
 */
export async function calculateBookingTotal(
  bookingId: string
): Promise<{ success: boolean; total?: number; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Use database function to calculate total
    const result = await adminClient.rpc("calculate_booking_total", {
      booking_uuid: bookingId,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, total: result.data as number };
  } catch (error) {
    console.error("Error calculating booking total:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate booking total",
    };
  }
}

