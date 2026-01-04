import { Hono } from "hono";
import {
  getPendingPayouts,
  createPayout,
  getPayoutHistory,
  getPayoutDetails,
  getRevenueSummary,
} from "@/core/billing";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

export const payoutRoutes = new Hono();

// Get pending payouts (admin only)
payoutRoutes.get("/pending", authMiddleware, requirePermission("billing.read"), async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const listingId = c.req.query("listingId");
    const minimumAmount = c.req.query("minimumAmount")
      ? parseInt(c.req.query("minimumAmount")!)
      : undefined;

    const result = await getPendingPayouts({
      tenantId,
      listingId,
      minimumAmount,
    });

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error fetching pending payouts:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pending payouts",
      },
      500
    );
  }
});

// Create payout (admin only)
payoutRoutes.post("/create", authMiddleware, requirePermission("billing.write"), async (c) => {
  try {
    const body = await c.req.json();
    const { tenantId, listingId, amount, currency } = body;

    if (!tenantId) {
      return c.json({ success: false, error: "Missing tenantId" }, 400);
    }

    const result = await createPayout({
      tenantId,
      listingId,
      amount,
      currency,
    });

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error creating payout:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create payout",
      },
      500
    );
  }
});

// Get payout history
payoutRoutes.get("/history", authMiddleware, async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;

    const result = await getPayoutHistory({
      tenantId,
      limit,
    });

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error fetching payout history:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch payout history",
      },
      500
    );
  }
});

// Get payout details
payoutRoutes.get("/:payoutId", authMiddleware, async (c) => {
  try {
    const payoutId = c.req.param("payoutId");

    if (!payoutId) {
      return c.json({ success: false, error: "Missing payoutId" }, 400);
    }

    const result = await getPayoutDetails(payoutId);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error fetching payout details:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch payout details",
      },
      500
    );
  }
});

// Get revenue summary
payoutRoutes.get("/revenue/summary", authMiddleware, async (c) => {
  try {
    const listingId = c.req.query("listingId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const result = await getRevenueSummary({
      listingId,
      startDate,
      endDate,
    });

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch revenue summary",
      },
      500
    );
  }
});

