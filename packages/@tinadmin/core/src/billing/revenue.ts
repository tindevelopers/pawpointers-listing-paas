/**
 * Revenue Calculation Service
 * Handles hybrid fee model calculations (percentage + fixed fee)
 * Note: These are pure utility functions that can run on both client and server
 */

export interface RevenueCalculation {
  totalAmount: number;
  platformFeePercent: number;
  platformFeeFixed: number;
  platformFeeTotal: number;
  listingOwnerAmount: number;
  currency: string;
}

export interface RevenueSettings {
  feePercent: number;
  feeFixed: number;
  minimumPayout?: number;
}

/**
 * Calculate revenue split using hybrid fee model
 * @param totalAmount - Total amount in cents (Stripe format)
 * @param feePercent - Platform fee percentage (e.g., 10 for 10%)
 * @param feeFixed - Platform fixed fee in cents
 * @param currency - Currency code (default: 'usd')
 * @returns Revenue calculation breakdown
 */
export function calculateRevenue(
  totalAmount: number,
  feePercent: number,
  feeFixed: number,
  currency: string = "usd"
): RevenueCalculation {
  // Ensure amounts are positive
  if (totalAmount < 0) {
    throw new Error("Total amount must be positive");
  }
  if (feePercent < 0 || feePercent > 100) {
    throw new Error("Fee percentage must be between 0 and 100");
  }
  if (feeFixed < 0) {
    throw new Error("Fixed fee must be positive");
  }

  // Calculate percentage fee (round to nearest cent)
  const platformFeePercent = Math.round((totalAmount * feePercent) / 100);
  
  // Calculate total platform fee
  const platformFeeTotal = platformFeePercent + feeFixed;
  
  // Calculate listing owner amount (ensure it's not negative)
  const listingOwnerAmount = Math.max(0, totalAmount - platformFeeTotal);

  return {
    totalAmount,
    platformFeePercent,
    platformFeeFixed: feeFixed,
    platformFeeTotal,
    listingOwnerAmount,
    currency,
  };
}

/**
 * Calculate revenue from revenue settings object
 * @param totalAmount - Total amount in cents
 * @param settings - Revenue settings with feePercent and feeFixed
 * @param currency - Currency code
 * @returns Revenue calculation breakdown
 */
export function calculateRevenueFromSettings(
  totalAmount: number,
  settings: RevenueSettings,
  currency: string = "usd"
): RevenueCalculation {
  return calculateRevenue(
    totalAmount,
    settings.feePercent,
    settings.feeFixed,
    currency
  );
}

/**
 * Format amount from cents to decimal (for display)
 * @param amountInCents - Amount in cents
 * @param currency - Currency code
 * @returns Formatted amount string
 */
export function formatAmount(amountInCents: number, currency: string = "usd"): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Parse amount from decimal to cents (for Stripe)
 * @param amount - Amount as decimal number
 * @returns Amount in cents
 */
export function parseAmountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Get default revenue settings
 * @returns Default revenue settings
 */
export function getDefaultRevenueSettings(): RevenueSettings {
  return {
    feePercent: 10,
    feeFixed: 200, // $2.00 in cents
    minimumPayout: 1000, // $10.00 in cents
  };
}

/**
 * Validate revenue settings
 * @param settings - Revenue settings to validate
 * @returns True if valid, throws error if invalid
 */
export function validateRevenueSettings(settings: RevenueSettings): boolean {
  if (settings.feePercent < 0 || settings.feePercent > 100) {
    throw new Error("Fee percentage must be between 0 and 100");
  }
  if (settings.feeFixed < 0) {
    throw new Error("Fixed fee must be positive");
  }
  if (settings.minimumPayout !== undefined && settings.minimumPayout < 0) {
    throw new Error("Minimum payout must be positive");
  }
  return true;
}

