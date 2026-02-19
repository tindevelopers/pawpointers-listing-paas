/**
 * Booking AI Assistant
 *
 * Webhook-driven, non-agentic assistant that:
 * - Drafts confirmation/reminder/follow-up messages
 * - Flags conflicts or missing info
 * - Summarizes booking context for provider
 */

import { getChatProvider } from "@listing-platform/ai";
import { getAIClient } from "@listing-platform/ai";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingAssistantTrigger =
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_REJECTED";

export interface BookingContext {
  id: string;
  tenant_id: string | null;
  listing_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  confirmation_code: string | null;
  guest_details: Record<string, unknown> | null;
  special_requests: string | null;
  listing_title?: string | null;
  external_provider?: string | null;
}

export interface AssistantOutput {
  summary?: string;
  confirmation_draft?: string;
  reminder_draft?: string;
  followup_draft?: string;
  conflict_flags?: string[];
  notes?: string;
}

const SYSTEM_PROMPT = `You are a helpful booking assistant for service providers. Generate concise, professional drafts and summaries.
Output valid JSON only, no markdown code blocks. Use this shape:
{
  "summary": "1-2 sentence summary of the booking for the provider",
  "confirmation_draft": "draft email/message to confirm the booking (if applicable)",
  "reminder_draft": "draft reminder message (if applicable)",
  "followup_draft": "draft follow-up message (if applicable)",
  "conflict_flags": ["list of issues e.g. missing_contact_email", "overlapping_booking"],
  "notes": "any other brief notes for the provider"
}
Omit fields that don't apply. Be concise.`;

function buildUserPrompt(
  booking: BookingContext,
  trigger: BookingAssistantTrigger
): string {
  const guest = booking.guest_details as { primaryContact?: { email?: string; name?: string } } | undefined;
  const email = guest?.primaryContact?.email ?? "(not provided)";
  const name = guest?.primaryContact?.name ?? "(not provided)";

  return `Booking event: ${trigger}
Booking ID: ${booking.id}
Listing: ${booking.listing_title ?? "N/A"}
Dates: ${booking.start_date} to ${booking.end_date}
Time: ${booking.start_time ?? "—"} to ${booking.end_time ?? "—"}
Status: ${booking.status}
Confirmation code: ${booking.confirmation_code ?? "—"}
Guest: ${name} (${email})
Special requests: ${booking.special_requests ?? "None"}

Generate appropriate drafts and notes for this ${trigger} event. Flag any missing info (e.g. no email).`;
}

function parseJsonResponse(text: string): AssistantOutput | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as AssistantOutput;
  } catch {
    return null;
  }
}

export async function processBookingAssistant(
  supabase: SupabaseClient,
  bookingId: string,
  triggerEvent: BookingAssistantTrigger,
  options?: { timeoutMs?: number }
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 8000;

  try {
    const { data: booking } = await (supabase as any)
      .from("bookings")
      .select(
        "id, tenant_id, listing_id, start_date, end_date, start_time, end_time, status, confirmation_code, guest_details, special_requests, external_provider"
      )
      .eq("id", bookingId)
      .single();

    if (!booking) return;

    let listingTitle: string | null = null;
    if (booking.listing_id) {
      const { data: listing } = await (supabase as any)
        .from("listings")
        .select("title")
        .eq("id", booking.listing_id)
        .single();
      listingTitle = listing?.title ?? null;
    }

    const context: BookingContext = {
      ...booking,
      listing_title: listingTitle,
    };

    const chatProvider = getChatProvider();
    const { resolvedConfig } = getAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const completion = await chatProvider.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(context, triggerEvent) },
      ],
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: resolvedConfig.maxTokens,
      temperature: 0.3,
    });

    clearTimeout(timeout);

    const output = parseJsonResponse(completion.text || "");
    if (!output) return;

    const upsertNote = async (
      noteType: string,
      content: string,
      metadata?: Record<string, unknown>
    ) => {
      if (!content.trim()) return;
      await (supabase as any)
        .from("booking_ai_assistant_notes")
        .upsert(
          {
            booking_id: bookingId,
            tenant_id: booking.tenant_id,
            note_type: noteType,
            content: content.trim(),
            metadata: metadata ?? {},
            trigger_event: triggerEvent,
          },
          {
            onConflict: "booking_id,note_type",
          }
        );
    };

    const summaryText = [output.summary, output.notes].filter(Boolean).join("\n\n");
    if (summaryText.trim()) {
      await upsertNote("summary", summaryText.trim());
    }
    if (output.confirmation_draft && ["BOOKING_CREATED", "BOOKING_RESCHEDULED"].includes(triggerEvent)) {
      await upsertNote("confirmation_draft", output.confirmation_draft);
    }
    if (output.reminder_draft) {
      await upsertNote("reminder_draft", output.reminder_draft);
    }
    if (output.followup_draft) {
      await upsertNote("followup_draft", output.followup_draft);
    }
    if (output.conflict_flags && output.conflict_flags.length > 0) {
      await upsertNote("conflict_flag", output.conflict_flags.join(". "), {
        flags: output.conflict_flags,
      });
    }
  } catch (err) {
    console.error("[BookingAssistant] Error:", err);
  }
}
