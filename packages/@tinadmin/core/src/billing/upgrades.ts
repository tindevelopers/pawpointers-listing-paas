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

export interface UpgradePreview {
  currentPlan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
  newPlan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
  prorationAmount: number;
  immediateCharge: number;
  nextBillingDate: string;
  currency: string;
}

export interface AvailableUpgrade {
  priceId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  currentPlan: boolean;
}

/**
 * Get available upgrade plans for current subscription
 */
export async function getAvailableUpgrades(): Promise<{
  success: boolean;
  upgrades?: AvailableUpgrade[];
  currentPlan?: AvailableUpgrade;
  error?: string;
}> {
  try {
    await requirePermission("billing.read");

    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    // Get current active subscription
    const subscriptionResult: {
      data: {
        stripe_price_id: string;
        stripe_product_id: string;
        plan_name: string;
        plan_price: number;
        billing_cycle: string;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_subscriptions")
      .select("stripe_price_id, stripe_product_id, plan_name, plan_price, billing_cycle")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentSubscription = subscriptionResult.data;

    // Get all available products/prices
    const pricesResult: {
      data: Array<{
        stripe_price_id: string;
        stripe_product_id: string;
        unit_amount: number;
        billing_cycle: string;
        stripe_products: {
          name: string;
          description: string;
        };
      }> | null;
      error: any;
    } = await adminClient
      .from("stripe_prices")
      .select(
        "stripe_price_id, stripe_product_id, unit_amount, billing_cycle, stripe_products(name, description)"
      )
      .eq("active", true)
      .order("unit_amount", { ascending: true });

    if (pricesResult.error) {
      return { success: false, error: pricesResult.error.message };
    }

    const prices = pricesResult.data || [];
    const upgrades: AvailableUpgrade[] = [];
    let currentPlan: AvailableUpgrade | undefined;

    for (const price of prices) {
      const isCurrentPlan =
        currentSubscription?.stripe_price_id === price.stripe_price_id;

      const upgrade: AvailableUpgrade = {
        priceId: price.stripe_price_id,
        productId: price.stripe_product_id,
        name: price.stripe_products.name,
        description: price.stripe_products.description || "",
        price: price.unit_amount,
        interval: price.billing_cycle === "annual" ? "year" : "month",
        features: [], // Could be extended to fetch from metadata
        currentPlan: isCurrentPlan,
      };

      if (isCurrentPlan) {
        currentPlan = upgrade;
      } else {
        upgrades.push(upgrade);
      }
    }

    return { success: true, upgrades, currentPlan };
  } catch (error) {
    console.error("Error fetching available upgrades:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch available upgrades",
    };
  }
}

/**
 * Preview upgrade cost with proration
 */
export async function previewUpgrade(
  newPriceId: string
): Promise<{
  success: boolean;
  preview?: UpgradePreview;
  error?: string;
}> {
  try {
    await requirePermission("billing.read");

    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    // Get current subscription
    const subscriptionResult: {
      data: {
        stripe_subscription_id: string;
        stripe_price_id: string;
        plan_name: string;
        plan_price: number;
        billing_cycle: string;
        current_period_end: string;
        currency: string;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_subscriptions")
      .select(
        "stripe_subscription_id, stripe_price_id, plan_name, plan_price, billing_cycle, current_period_end, currency"
      )
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscriptionResult.data) {
      return { success: false, error: "No active subscription found" };
    }

    const currentSub = subscriptionResult.data;

    // Get new price details
    const newPriceResult: {
      data: {
        unit_amount: number;
        billing_cycle: string;
        stripe_products: {
          name: string;
        };
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_prices")
      .select("unit_amount, billing_cycle, stripe_products(name)")
      .eq("stripe_price_id", newPriceId)
      .single();

    if (!newPriceResult.data) {
      return { success: false, error: "New price not found" };
    }

    const newPrice = newPriceResult.data;

    // Get upcoming invoice from Stripe with proration
    const customerResult = await adminClient
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();
    
    const upcomingInvoice = await (getStripe().invoices as any).retrieveUpcoming({
      customer: (customerResult.data as any)?.stripe_customer_id,
      subscription: currentSub.stripe_subscription_id,
      subscription_items: [
        {
          id: (
            await getStripe().subscriptions.retrieve(currentSub.stripe_subscription_id)
          ).items.data[0].id,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: "always_invoice",
    });

    const prorationLineItem = upcomingInvoice.lines.data.find(
      (line: any) => line.proration === true
    );
    const prorationAmount = prorationLineItem?.amount || 0;

    const preview: UpgradePreview = {
      currentPlan: {
        id: currentSub.stripe_price_id,
        name: currentSub.plan_name,
        price: currentSub.plan_price,
        interval: currentSub.billing_cycle,
      },
      newPlan: {
        id: newPriceId,
        name: newPrice.stripe_products.name,
        price: newPrice.unit_amount,
        interval: newPrice.billing_cycle,
      },
      prorationAmount: Math.abs(prorationAmount), // Proration is usually negative (credit)
      immediateCharge: upcomingInvoice.amount_due,
      nextBillingDate: new Date(
        upcomingInvoice.next_payment_attempt || upcomingInvoice.period_end * 1000
      ).toISOString(),
      currency: currentSub.currency || "usd",
    };

    return { success: true, preview };
  } catch (error) {
    console.error("Error previewing upgrade:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to preview upgrade",
    };
  }
}

/**
 * Upgrade subscription to new plan
 */
export async function upgradeSubscription(
  newPriceId: string,
  prorationBehavior: "always_invoice" | "create_prorations" | "none" = "always_invoice"
): Promise<{
  success: boolean;
  subscription?: Stripe.Subscription;
  invoice?: Stripe.Invoice;
  error?: string;
}> {
  try {
    await requirePermission("billing.write");

    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    // Get current subscription
    const subscriptionResult: {
      data: {
        stripe_subscription_id: string;
        id: string;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscriptionResult.data) {
      return { success: false, error: "No active subscription found" };
    }

    const dbSubscription = subscriptionResult.data;

    // Get current subscription from Stripe
    const currentSubscription = await getStripe().subscriptions.retrieve(
      dbSubscription.stripe_subscription_id,
      {
        expand: ["items.data.price.product"],
      }
    );

    // Update subscription in Stripe
    const updatedSubscription = await getStripe().subscriptions.update(
      dbSubscription.stripe_subscription_id,
      {
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: prorationBehavior,
        billing_cycle_anchor: "unchanged",
      }
    );

    // Get updated price details
    const newPriceResult: {
      data: {
        unit_amount: number;
        billing_cycle: string;
        stripe_products: {
          name: string;
        };
      } | null;
    } = await adminClient
      .from("stripe_prices")
      .select("unit_amount, billing_cycle, stripe_products(name)")
      .eq("stripe_price_id", newPriceId)
      .single();

    // Update in database
    if (newPriceResult.data) {
      await (adminClient
        .from("stripe_subscriptions") as any)
        .update({
          stripe_price_id: newPriceId,
          stripe_product_id: updatedSubscription.items.data[0].price.product as string,
          plan_name: (newPriceResult.data as any).stripe_products.name,
          plan_price: (newPriceResult.data as any).unit_amount,
          billing_cycle: (newPriceResult.data as any).billing_cycle,
          status: updatedSubscription.status,
          current_period_start: new Date(
            (updatedSubscription as any).current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            (updatedSubscription as any).current_period_end * 1000
          ).toISOString(),
        })
        .eq("id", dbSubscription.id);
    }

    // Get latest invoice if created
    let invoice: Stripe.Invoice | undefined;
    if (updatedSubscription.latest_invoice) {
      invoice =
        typeof updatedSubscription.latest_invoice === "string"
          ? await getStripe().invoices.retrieve(updatedSubscription.latest_invoice)
          : updatedSubscription.latest_invoice;
    }

    return { success: true, subscription: updatedSubscription, invoice };
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upgrade subscription",
    };
  }
}

/**
 * Downgrade subscription to lower plan
 */
export async function downgradeSubscription(
  newPriceId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{
  success: boolean;
  subscription?: Stripe.Subscription;
  error?: string;
}> {
  try {
    await requirePermission("billing.write");

    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return { success: false, error: "No tenant context found" };
    }

    const adminClient = createAdminClient();

    // Get current subscription
    const subscriptionResult: {
      data: {
        stripe_subscription_id: string;
        id: string;
      } | null;
      error: any;
    } = await adminClient
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, id")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscriptionResult.data) {
      return { success: false, error: "No active subscription found" };
    }

    const dbSubscription = subscriptionResult.data;

    // Update subscription - schedule change at period end for downgrades
    const updatedSubscription = await getStripe().subscriptions.update(
      dbSubscription.stripe_subscription_id,
      {
        items: [
          {
            id: (
              await getStripe().subscriptions.retrieve(dbSubscription.stripe_subscription_id)
            ).items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: cancelAtPeriodEnd ? "none" : "create_prorations",
        billing_cycle_anchor: cancelAtPeriodEnd ? "unchanged" : "now",
      }
    );

    // Update in database
    const newPriceResult: {
      data: {
        unit_amount: number;
        billing_cycle: string;
        stripe_products: {
          name: string;
        };
      } | null;
    } = await adminClient
      .from("stripe_prices")
      .select("unit_amount, billing_cycle, stripe_products(name)")
      .eq("stripe_price_id", newPriceId)
      .single();

    if (newPriceResult.data) {
      await (adminClient
        .from("stripe_subscriptions") as any)
        .update({
          stripe_price_id: newPriceId,
          stripe_product_id: updatedSubscription.items.data[0].price.product as string,
          plan_name: (newPriceResult.data as any).stripe_products.name,
          plan_price: (newPriceResult.data as any).unit_amount,
          billing_cycle: (newPriceResult.data as any).billing_cycle,
          status: updatedSubscription.status,
        })
        .eq("id", dbSubscription.id);
    }

    return { success: true, subscription: updatedSubscription };
  } catch (error) {
    console.error("Error downgrading subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to downgrade subscription",
    };
  }
}

