import { Hono } from "hono";
import {
  createBookingPayment,
  processBookingPayment,
  refundBookingPayment,
  calculateBookingTotal,
} from "@/core/billing";
import { authMiddleware } from "../middleware/auth";

export const bookingPaymentRoutes = new Hono();

// Create booking payment
bookingPaymentRoutes.post("/create", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const {
      bookingId,
      listingOwnerTenantId,
      customerTenantId,
      amount,
      feePercent,
      feeFixed,
      currency,
      metadata,
    } = body;

    if (!bookingId || !listingOwnerTenantId || !customerTenantId || !amount) {
      return c.json(
        { success: false, error: "Missing required fields" },
        400
      );
    }

    const result = await createBookingPayment({
      bookingId,
      listingOwnerTenantId,
      customerTenantId,
      amount,
      feePercent,
      feeFixed,
      currency,
      metadata,
    });

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error creating booking payment:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create booking payment",
      },
      500
    );
  }
});

// Confirm booking payment
bookingPaymentRoutes.post("/confirm", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return c.json({ success: false, error: "Missing paymentIntentId" }, 400);
    }

    const result = await processBookingPayment(paymentIntentId);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error confirming booking payment:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to confirm booking payment",
      },
      500
    );
  }
});

// Refund booking payment
bookingPaymentRoutes.post("/refund", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { bookingId, amount, reason } = body;

    if (!bookingId) {
      return c.json({ success: false, error: "Missing bookingId" }, 400);
    }

    const result = await refundBookingPayment(bookingId, amount, reason);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error refunding booking payment:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refund booking payment",
      },
      500
    );
  }
});

// Calculate booking total
bookingPaymentRoutes.get("/calculate/:bookingId", authMiddleware, async (c) => {
  try {
    const bookingId = c.req.param("bookingId");

    if (!bookingId) {
      return c.json({ success: false, error: "Missing bookingId" }, 400);
    }

    const result = await calculateBookingTotal(bookingId);

    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    console.error("Error calculating booking total:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate booking total",
      },
      500
    );
  }
});

