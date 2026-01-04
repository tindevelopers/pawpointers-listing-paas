import { Hono } from "hono";
import {
  getAvailableUpgrades,
  previewUpgrade,
  upgradeSubscription,
  downgradeSubscription,
} from "@/core/billing";
import { authMiddleware } from "../middleware/auth";

export const subscriptionUpgradeRoutes = new Hono();

// Get available upgrades
subscriptionUpgradeRoutes.get("/upgrades", authMiddleware, async (c) => {
  try {
    const result = await getAvailableUpgrades();

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error fetching available upgrades:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch upgrades",
      },
      500
    );
  }
});

// Preview upgrade cost
subscriptionUpgradeRoutes.post("/preview", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { newPriceId } = body;

    if (!newPriceId) {
      return c.json({ success: false, error: "Missing newPriceId" }, 400);
    }

    const result = await previewUpgrade(newPriceId);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error previewing upgrade:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview upgrade",
      },
      500
    );
  }
});

// Upgrade subscription
subscriptionUpgradeRoutes.post("/upgrade", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { newPriceId, prorationBehavior } = body;

    if (!newPriceId) {
      return c.json({ success: false, error: "Missing newPriceId" }, 400);
    }

    const result = await upgradeSubscription(
      newPriceId,
      prorationBehavior || "always_invoice"
    );

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upgrade subscription",
      },
      500
    );
  }
});

// Downgrade subscription
subscriptionUpgradeRoutes.post("/downgrade", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { newPriceId, cancelAtPeriodEnd } = body;

    if (!newPriceId) {
      return c.json({ success: false, error: "Missing newPriceId" }, 400);
    }

    const result = await downgradeSubscription(newPriceId, cancelAtPeriodEnd ?? true);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error downgrading subscription:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to downgrade subscription",
      },
      500
    );
  }
});

