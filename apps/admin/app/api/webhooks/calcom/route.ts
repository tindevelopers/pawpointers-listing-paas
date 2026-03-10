import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/core/database/admin-client";
import {
  processBookingAssistant,
  type BookingAssistantTrigger,
} from "@/lib/booking-assistant";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CALCOM_WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET;

function verifySignature(body: string, signature: string | null): boolean {
  if (!CALCOM_WEBHOOK_SECRET || !signature) return false;
  const hmac = crypto.createHmac("sha256", CALCOM_WEBHOOK_SECRET);
  const digest = hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest, "hex"));
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("cal-signature");

  if (CALCOM_WEBHOOK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { triggerEvent: string; createdAt: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { triggerEvent, payload } = event;
  const uid = payload.uid as string | undefined;
  if (!uid) {
    return NextResponse.json({ error: "Missing uid in payload" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const findExisting = async (id: string) => {
    const { data } = await (adminClient as any)
      .from("bookings")
      .select("id")
      .eq("external_provider", "calcom")
      .eq("external_booking_id", id)
      .maybeSingle();
    return data;
  };

  const updateOrInsertFromPayload = async (updates: Record<string, unknown>) => {
    const rescheduleUid = (payload as any).rescheduleUid;
    const existing = await findExisting(uid) || (rescheduleUid ? await findExisting(rescheduleUid) : null);

    if (existing) {
      await (adminClient as any)
        .from("bookings")
        .update(updates)
        .eq("id", existing.id);
    } else if (triggerEvent === "BOOKING_CREATED") {
      const metadata = (payload.metadata || {}) as Record<string, unknown>;
      const tenantId = metadata.tenantId as string | undefined;
      const listingId = metadata.listingId as string | undefined;
      const startTime = payload.startTime as string;
      const endTime = payload.endTime as string;
      const startDate = startTime?.slice(0, 10);
      const endDate = endTime?.slice(0, 10);
      const attendee = (payload.attendees as any[])?.[0];
      const confirmationCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      if (tenantId) {
        await (adminClient as any)
          .from("bookings")
          .insert({
            tenant_id: tenantId,
            listing_id: listingId || null,
            user_id: null,
            start_date: startDate,
            end_date: endDate,
            start_time: startTime?.slice(11, 16),
            end_time: endTime?.slice(11, 16),
            guest_count: 1,
            guest_details: attendee ? { primaryContact: { email: attendee.email, name: attendee.name } } : null,
            base_price: (payload.price as number) || 0,
            service_fee: 0,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: (payload.price as number) || 0,
            currency: (payload.currency as string) || "USD",
            payment_status: "pending",
            status: (payload.status as string) === "ACCEPTED" ? "confirmed" : "pending",
            external_provider: "calcom",
            external_booking_id: uid,
            confirmation_code: confirmationCode,
          });
      }
    }
  };

  try {
    switch (triggerEvent) {
      case "BOOKING_CREATED":
        await updateOrInsertFromPayload({
          status: (payload.status as string) === "ACCEPTED" ? "confirmed" : "pending",
          updated_at: new Date().toISOString(),
        });
        break;

      case "BOOKING_CANCELLED":
        await (adminClient as any)
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: (payload.cancellationReason as string) || "Cancelled via Cal.com",
            updated_at: new Date().toISOString(),
          })
          .eq("external_provider", "calcom")
          .eq("external_booking_id", uid);
        break;

      case "BOOKING_RESCHEDULED": {
        const startTime = payload.startTime as string;
        const endTime = payload.endTime as string;
        const rescheduleUid = (payload as any).rescheduleUid;
        const { data: row } = await (adminClient as any)
          .from("bookings")
          .select("id")
          .eq("external_provider", "calcom")
          .eq("external_booking_id", rescheduleUid || uid)
          .maybeSingle();
        if (row) {
          await (adminClient as any)
            .from("bookings")
            .update({
              start_date: startTime?.slice(0, 10),
              end_date: endTime?.slice(0, 10),
              start_time: startTime?.slice(11, 16),
              end_time: endTime?.slice(11, 16),
              external_booking_id: uid,
              status: (payload.status as string) === "ACCEPTED" ? "confirmed" : "pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
        break;
      }

      case "BOOKING_REJECTED":
        await (adminClient as any)
          .from("bookings")
          .update({
            status: "cancelled",
            cancellation_reason: (payload.rejectionReason as string) || "Rejected",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("external_provider", "calcom")
          .eq("external_booking_id", uid);
        break;

      case "BOOKING_CONFIRMED":
        await (adminClient as any)
          .from("bookings")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("external_provider", "calcom")
          .eq("external_booking_id", uid);
        break;

      default:
        break;
    }

    // Trigger AI assistant (non-blocking; skip if AI not configured)
    const hasAI =
      process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY;
    if (hasAI) {
      const { data: booking } = await (adminClient as any)
        .from("bookings")
        .select("id")
        .eq("external_provider", "calcom")
        .eq("external_booking_id", uid)
        .maybeSingle();
      if (booking?.id) {
        const validTriggers: BookingAssistantTrigger[] = [
          "BOOKING_CREATED",
          "BOOKING_CANCELLED",
          "BOOKING_RESCHEDULED",
          "BOOKING_REJECTED",
          "BOOKING_CONFIRMED",
        ];
        if (validTriggers.includes(triggerEvent as BookingAssistantTrigger)) {
          processBookingAssistant(
            adminClient as any,
            booking.id,
            triggerEvent as BookingAssistantTrigger
          ).catch((err) =>
            console.error("[Cal.com webhook] AI assistant error:", err)
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Cal.com webhook] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
